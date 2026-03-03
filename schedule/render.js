// render.js — CIRMS Conference Schedule Viewer
//
// Parses a CSV schedule and renders it as a responsive, tabbed three-track
// grid.
//
// On desktop the layout is a 4-column CSS Grid (time gutter + one column
// per base track: MApp, RPHS, RPME), with cards spanning rows via computed
// grid-row values and a sticky band holding the column headers. On mobile
// the grid collapses to a single-column flexbox whose order groups parallel
// tracks by priority between full-width anchors.
//
// Joint tracks like "MApp-RPHS" duplicate the card into both columns on desktop
// and hide the secondary copy on mobile. Full-width tracks (Plen, Break, Photo,
// Train) span all three columns.
//
// Rows whose title matches "Session N: …" render as colored header strips
// rather than cards. The CSV parser handles quoted fields but not escaped
// quotes — sufficient for the controlled input this schedule uses.

// ── Debug ─────────────────────────────────────────────────────────────────────

const DEBUG_DAY   = "Mon";   // "Mon"/"Tue"/"Wed" to test now-marker with today's clock; null for production
const DEBUG_TIME  = "14:10"; // "HH:MM" to override current time; null for production

// ── Config ────────────────────────────────────────────────────────────────────

const CSV_FILE    = "schedule.csv";
const FULL_TRACKS = new Set(["Plen","Break","Photo","Train"]);
const BASE_TRACKS = ["MApp","RPHS","RPME"];
const TRACK_COL   = { MApp:2, RPHS:3, RPME:4 };   // grid columns (col 1 = time gutter)
const DAY_LABELS  = { Mon:"Monday, April 13", Tue:"Tuesday, April 14", Wed:"Wednesday, April 15" };
const DAY_DATES   = { Mon:"2026-04-13",      Tue:"2026-04-14",      Wed:"2026-04-15" };

// joint track → CSS class = highest-priority track in pair (MApp > RPHS > RPME)
const TRACK_PRIORITY = { MApp: 0, RPHS: 1, RPME: 2 };

function jointParts(track) {
  if (!track.includes("-")) return null;
  const parts = track.split("-");
  if (parts.every(p => BASE_TRACKS.includes(p))) return parts;
  return null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const toMin = t => { if (!t) return 0; const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };
const parseDur = d => { if (!d || !d.trim()) return 30; const [h, m] = d.split(":").map(Number); return h * 60 + (m || 0) || 30; };
const fmt = m => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const isChair = item => /^session\s+\d+:/i.test(item.Event || "");

/** Current Eastern Time as { date: "YYYY-MM-DD", min: minutes-since-midnight } */
function getET() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false
  }).formatToParts(new Date());
  const g = type => parts.find(p => p.type === type).value;
  return {
    date: DEBUG_DAY ? DAY_DATES[DEBUG_DAY] : `${g("year")}-${g("month")}-${g("day")}`,
    min: DEBUG_TIME ? toMin(DEBUG_TIME) : parseInt(g("hour")) * 60 + parseInt(g("minute"))
  };
}

let nowMarkerInfo = null;  // { el, timePoints } — at most one marker across all day panes

const partnerBadgeStyle = t => `background:var(--${t.toLowerCase()}-border);color:#fff;`;

function cardInnerHTML(item, partnerTrack) {
  const dur = parseDur(item.Dur);
  const durStr = dur ? ` · ${dur} min` : "";
  return `
    ${partnerTrack ? `<div class="sc-joint-badge" style="${partnerBadgeStyle(partnerTrack)}">Joint with ${partnerTrack}</div>` : ""}
    <div class="sc-time">${item.Time}${durStr}</div>
    <div class="sc-title">${item.Event}</div>
    ${item.Speaker ? `<div class="sc-speaker">${item.Speaker}${item.Affil ? ` &nbsp;·&nbsp; <span class="sc-affil">${item.Affil}</span>` : ""}</div>` : ""}
  `;
}

// ── Build day ─────────────────────────────────────────────────────────────────

function buildDay(day, items) {
  const sorted = [...items].sort((a, b) => toMin(a.Time) - toMin(b.Time));

  // Cache joint-track info per item
  sorted.forEach(item => { item._joints = jointParts(item.Track); });

  const timePoints = [...new Set([
    ...sorted.map(i => toMin(i.Time)),
    ...sorted.map(i => toMin(i.Time) + parseDur(i.Dur))
  ])].sort((a, b) => a - b);

  // Inject current ET time as a grid row (if this day is today and time is in range)
  const et = getET();
  const nowMin = DAY_DATES[day] === et.date
    && et.min >= timePoints[0] && et.min <= timePoints[timePoints.length - 1]
    ? et.min : null;
  if (nowMin !== null && !timePoints.includes(nowMin)) {
    timePoints.push(nowMin);
    timePoints.sort((a, b) => a - b);
  }

  const rowOf = min => timePoints.indexOf(min) + 1;
  const totalRows = timePoints.length;

  const pane = document.createElement("div");
  pane.className = "tab-pane fade";
  pane.id = `pane-${day}`;

  const grid = document.createElement("div");
  grid.className = "schedule-grid";
  grid.style.gridTemplateRows = `repeat(${totalRows}, auto)`;
  grid.style.rowGap = "3px";

  // Helper: create, style, and append a div to the grid
  function addEl(cls, css, order, html) {
    const el = document.createElement("div");
    el.className = cls;
    el.style.cssText = css;
    el.style.order = order;
    el.innerHTML = html;
    grid.appendChild(el);
  }

  // Time labels
  const shownTimes = new Set(sorted.map(i => toMin(i.Time)));
  shownTimes.forEach(t => {
    const lbl = document.createElement("div");
    lbl.className = "time-lbl";
    lbl.style.gridRow = `${rowOf(t)}`;
    lbl.textContent = fmt(t);
    grid.appendChild(lbl);
  });

  // ── Mobile order ──────────────────────────────────────────────────────────
  // Full-width items keep their natural time position. Between consecutive
  // full-width items, parallel (per-track) cards are grouped by track
  // priority (MApp → RPHS → RPME), then by time within each track.
  // The resulting index is applied as CSS `order` for the mobile flexbox.

  function effectivePriority(item) {
    if (FULL_TRACKS.has(item.Track)) return -1;
    if (item._joints) return Math.min(...item._joints.map(t => TRACK_PRIORITY[t]));
    return TRACK_PRIORITY[item.Track] ?? 99;
  }

  const mobileOrderMap = new Map();
  let mobIdx = 0;
  let i = 0;
  while (i < sorted.length) {
    const item = sorted[i];
    if (FULL_TRACKS.has(item.Track)) {
      mobileOrderMap.set(item, mobIdx++);
      i++;
    } else {
      const block = [];
      while (i < sorted.length && !FULL_TRACKS.has(sorted[i].Track)) {
        block.push(sorted[i]);
        i++;
      }
      block.sort((a, b) => {
        const pd = effectivePriority(a) - effectivePriority(b);
        return pd !== 0 ? pd : toMin(a.Time) - toMin(b.Time);
      });
      block.forEach(it => mobileOrderMap.set(it, mobIdx++));
    }
  }

  // Compute now-marker mobile order: insert after last item starting ≤ nowMin
  let nowMarkerOrder = 0;
  if (nowMin !== null) {
    for (const [item, ord] of mobileOrderMap) {
      if (toMin(item.Time) <= nowMin) nowMarkerOrder = Math.max(nowMarkerOrder, ord + 1);
    }
    for (const [item, ord] of mobileOrderMap) {
      if (ord >= nowMarkerOrder) mobileOrderMap.set(item, ord + 1);
    }
  }

  // Extra now-markers between parallel track groups (mobile only)
  // Extra now-markers: for each track group in a parallel block, find where
  // "now" falls (after the last item starting ≤ nowMin). The primary marker
  // already covers one group; extras cover the rest.
  const extraMarkerOrders = [];
  if (nowMin !== null) {
    const ordered = [...mobileOrderMap.entries()].sort((a, b) => a[1] - b[1]);

    let idx = 0;
    while (idx < ordered.length) {
      if (FULL_TRACKS.has(ordered[idx][0].Track)) { idx++; continue; }

      // Parallel block: all consecutive non-full-width items
      const blockStart = idx;
      while (idx < ordered.length && !FULL_TRACKS.has(ordered[idx][0].Track)) idx++;

      // Walk track groups within this block
      let gi = blockStart;
      while (gi < idx) {
        const prio = effectivePriority(ordered[gi][0]);
        let bestOrd = null;
        while (gi < idx && effectivePriority(ordered[gi][0]) === prio) {
          if (toMin(ordered[gi][0].Time) <= nowMin) bestOrd = ordered[gi][1] + 1;
          gi++;
        }
        if (bestOrd !== null && bestOrd !== nowMarkerOrder) {
          extraMarkerOrders.push(bestOrd);
        }
      }
    }

    // Bump orders to make room (process highest insert point first)
    extraMarkerOrders.sort((a, b) => b - a);
    for (const insertOrd of extraMarkerOrders) {
      for (const [item, ord] of mobileOrderMap) {
        if (ord >= insertOrd) mobileOrderMap.set(item, ord + 1);
      }
      if (nowMarkerOrder >= insertOrd) nowMarkerOrder++;
    }
    // Adjust extra order values for the cascading shifts
    extraMarkerOrders.reverse();
    for (let k = 0; k < extraMarkerOrders.length; k++) {
      extraMarkerOrders[k] += k;
    }
  }

  // ── Render items
  sorted.forEach(item => {
    const startMin = toMin(item.Time);
    const dur      = parseDur(item.Dur);
    const rowCSS   = `grid-row: ${rowOf(startMin)} / ${rowOf(startMin + dur)};`;
    const track    = item.Track;
    const isFull   = FULL_TRACKS.has(track);
    const joints   = item._joints;
    const chair    = isChair(item);
    const order    = mobileOrderMap.get(item);
    const hlClass  = item.Highlight === "yes" ? " sc-highlight" : "";

    const sessHTML = (text, speaker) =>
      `<span class="sess-title">${text}</span>${speaker ? `<span class="sess-chair">${speaker}</span>` : ""}`;
    const text = chair ? item.Event.replace(/^session\s+\d+:\s*/i, "") : "";

    if (chair) {
      if (joints) {
        const sortedJ = [...joints].sort((a, b) => TRACK_PRIORITY[a] - TRACK_PRIORITY[b]);
        sortedJ.forEach((t, idx) => addEl(
          `sess-hdr ${t.toLowerCase()}${idx > 0 ? " joint-secondary" : ""}`,
          `${rowCSS} grid-column: ${TRACK_COL[t]};`, order,
          sessHTML(text, item.Speaker)
        ));
      } else {
        const jClass = isFull ? "full" : track.toLowerCase();
        const colCSS = isFull ? "grid-column: 2 / -1;" : `grid-column: ${TRACK_COL[track]};`;
        addEl(`sess-hdr ${jClass}`, rowCSS + colCSS, order, sessHTML(text, item.Speaker));
      }
      return;
    }

    if (isFull) {
      const cls = track === "Break" ? "sc-mute" : "sc-plen";
      addEl(`sc ${cls}${hlClass}`, `${rowCSS} grid-column: 2 / -1;`, order, cardInnerHTML(item, null));
      return;
    }

    if (joints) {
      const sortedJ = [...joints].sort((a, b) => TRACK_PRIORITY[a] - TRACK_PRIORITY[b]);
      sortedJ.forEach((t, idx) => {
        const partner = sortedJ.find(p => p !== t);
        addEl(
          `sc sc-${t.toLowerCase()}${idx > 0 ? " joint-secondary" : ""}${hlClass}`,
          `${rowCSS} grid-column: ${TRACK_COL[t]};`, order,
          cardInnerHTML(item, partner)
        );
      });
      return;
    }

    addEl(
      `sc sc-${track.toLowerCase()}${hlClass}`,
      `${rowCSS} grid-column: ${TRACK_COL[track]};`, order,
      cardInnerHTML(item, null)
    );
  });

  // Now-markers: primary (desktop + mobile) + extras (mobile only)
  if (nowMin !== null) {
    const marker = document.createElement("div");
    marker.className = "now-marker";
    marker.dataset.time = fmt(nowMin);
    marker.style.gridRow = `${rowOf(nowMin)}`;
    marker.style.order = nowMarkerOrder;
    grid.appendChild(marker);
    nowMarkerInfo = { el: marker, timePoints };

    extraMarkerOrders.forEach(ord => {
      const extra = document.createElement("div");
      extra.className = "now-marker now-marker-extra";
      extra.dataset.time = fmt(nowMin);
      extra.style.order = ord;
      grid.appendChild(extra);
    });
  }

  pane.appendChild(grid);
  return pane;
}

// ── CSV parser ────────────────────────────────────────────────────────────────

function splitCSVLine(line) {
  const result = [];
  let cur = "", inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuote = !inQuote; }
    else if (ch === ',' && !inQuote) { result.push(cur); cur = ""; }
    else { cur += ch; }
  }
  result.push(cur);
  return result;
}

function parseCSV(text) {
  const lines = text.replace(/\r/g, "").split("\n").filter(l => l.trim());
  const headers = splitCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = splitCSVLine(line);
    const row = {};
    headers.forEach((h, i) => row[h.trim()] = (vals[i] || "").trim());
    return {
      Day:       row["Day"]         || "",
      Track:     row["Track"]       || "",
      Time:      row["Time"]        || "",
      Dur:       row["Duration"]    || "",
      Event:     row["Title"]       || row["Event"] || "",
      Speaker:   row["Speaker"]     || "",
      Affil:     row["Affiliation"] || "",
      Highlight: row["Star"] && row["Star"].trim().toLowerCase() === "yes" ? "yes" : "",
    };
  }).filter(r => r.Day);
}

// ── Assemble page ─────────────────────────────────────────────────────────────

function assemblePage(data) {
  const DAYS       = [...new Set(data.map(r => r.Day))].filter(Boolean);
  const tabsEl     = document.getElementById("dayTabs");
  const contentsEl = document.getElementById("dayContents");
  const selectEl   = document.getElementById("daySelect");

  DAYS.forEach((day, di) => {
    const items = data.filter(r => r.Day === day);
    const label = DAY_LABELS[day] || day;

    // Tab button
    const li = document.createElement("li");
    li.className = "nav-item";
    li.innerHTML = `<button class="nav-link ${di === 0 ? "active" : ""}"
      data-bs-toggle="tab" data-bs-target="#pane-${day}"
      type="button" role="tab">${label}</button>`;
    tabsEl.appendChild(li);

    // Mobile select option
    const opt = document.createElement("option");
    opt.value = day;
    opt.textContent = label;
    selectEl.appendChild(opt);

    // Day pane
    const pane = buildDay(day, items);
    if (di === 0) pane.classList.add("show", "active");
    contentsEl.appendChild(pane);
  });

  // Wire select → Bootstrap tab
  selectEl.addEventListener("change", () => {
    const btn = tabsEl.querySelector(`[data-bs-target="#pane-${selectEl.value}"]`);
    if (btn) bootstrap.Tab.getOrCreateInstance(btn).show();
  });

  // Keep select in sync when tabs are clicked
  tabsEl.addEventListener("shown.bs.tab", e => {
    const day = e.target.dataset.bsTarget?.replace("#pane-", "");
    if (day) selectEl.value = day;
  });

  // Live-update now-marker position every 60 s
  if (nowMarkerInfo) {
    const { el, timePoints } = nowMarkerInfo;
    setInterval(() => {
      const now = getET().min;
      if (now < timePoints[0] || now > timePoints[timePoints.length - 1]) {
        el.style.display = "none";
        return;
      }
      let bestRow = 1;
      for (let i = 0; i < timePoints.length; i++) {
        if (timePoints[i] <= now) bestRow = i + 1; else break;
      }
      el.style.gridRow = `${bestRow}`;
      el.dataset.time = fmt(now);
      el.style.display = "";
    }, 60_000);
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────

fetch(CSV_FILE)
  .then(r => {
    if (!r.ok) throw new Error(`Could not load ${CSV_FILE}: ${r.status}`);
    return r.text();
  })
  .then(text => assemblePage(parseCSV(text)))
  .catch(err => {
    document.getElementById("dayContents").innerHTML =
      `<div class="alert alert-danger mt-3">
        <strong>Could not load schedule.csv.</strong><br>${err.message}
      </div>`;
  });
