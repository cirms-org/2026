// ── Config ────────────────────────────────────────────────────────────────────

const CSV_FILE    = "schedule.csv";
const FULL_TRACKS = new Set(["Plen","Break","Start","Adjourn","End","Photo","Train"]);
const BASE_TRACKS = ["MApp","RPHS","RPME"];
const TRACK_COL   = { MApp:2, RPHS:3, RPME:4 };
const DAY_LABELS  = { Mon:"Monday, April 13", Tue:"Tuesday, April 14", Wed:"Wednesday, April 15" };

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

function partnerBadgeStyle(partnerTrack) {
  if (partnerTrack === "RPME") return `background:var(--rpme-border);color:#fff;`;
  if (partnerTrack === "RPHS") return `background:var(--rphs-border);color:#fff;`;
  if (partnerTrack === "MApp") return `background:var(--mapp-border);color:#fff;`;
  return `background:rgba(0,0,0,0.1);color:inherit;`;
}

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

  const timePoints = [...new Set([
    ...sorted.map(i => toMin(i.Time)),
    ...sorted.map(i => toMin(i.Time) + parseDur(i.Dur))
  ])].sort((a, b) => a - b);

  const rowOf = min => timePoints.indexOf(min) + 1;
  const totalRows = timePoints.length;

  const pane = document.createElement("div");
  pane.className = "tab-pane fade";
  pane.id = `pane-${day}`;

  const hdr = document.createElement("div");
  hdr.className = "track-header-row";
  hdr.innerHTML = `
    <div></div>
    <div class="track-col-hdr mapp"><span class="track-abbr">MApp</span><span class="track-full-name">Medical Applications</span></div>
    <div class="track-col-hdr rphs"><span class="track-abbr">RPHS</span><span class="track-full-name">Radiation Protection &amp; Homeland Security</span></div>
    <div class="track-col-hdr rpme"><span class="track-abbr">RPME</span><span class="track-full-name">Radiation Processing &amp; Material Effects</span></div>
  `;

  const grid = document.createElement("div");
  grid.className = "schedule-grid";
  grid.style.gridTemplateRows = `repeat(${totalRows}, auto)`;
  grid.style.rowGap = "3px";

  // Time labels
  const shownTimes = new Set(sorted.map(i => toMin(i.Time)));
  shownTimes.forEach(t => {
    const lbl = document.createElement("div");
    lbl.className = "time-lbl";
    lbl.style.gridRow = `${rowOf(t)}`;
    lbl.textContent = fmt(t);
    grid.appendChild(lbl);
  });

  // ── Mobile order: full-width items in time order; parallel blocks grouped by track priority
  function effectivePriority(track) {
    if (FULL_TRACKS.has(track)) return -1;
    const parts = jointParts(track);
    if (parts) {
      const p = [...parts].sort((a, b) => TRACK_PRIORITY[a] - TRACK_PRIORITY[b]);
      return TRACK_PRIORITY[p[0]];
    }
    return TRACK_PRIORITY[track] ?? 99;
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
        const pd = effectivePriority(a.Track) - effectivePriority(b.Track);
        return pd !== 0 ? pd : toMin(a.Time) - toMin(b.Time);
      });
      block.forEach(it => mobileOrderMap.set(it, mobIdx++));
    }
  }

  // ── Render items
  sorted.forEach(item => {
    const startMin = toMin(item.Time);
    const dur      = parseDur(item.Dur);
    const endMin   = startMin + dur;
    const rowStart = rowOf(startMin);
    const rowEnd   = rowOf(endMin);
    const rowCSS   = `grid-row: ${rowStart} / ${rowEnd};`;

    const track  = item.Track;
    const isFull = FULL_TRACKS.has(track);
    const joints = jointParts(track);
    const chair  = isChair(item);
    const isEnd  = track === "Adjourn" || track === "End" || track === "Start";

    // Session header strip
    if (chair) {
      if (joints) {
        const sortedJoints = [...joints].sort((a, b) => TRACK_PRIORITY[a] - TRACK_PRIORITY[b]);
        sortedJoints.forEach((t, idx) => {
          const hdrEl = document.createElement("div");
          hdrEl.className = `sess-hdr ${t.toLowerCase()}${idx > 0 ? " joint-secondary" : ""}`;
          hdrEl.style.cssText = `${rowCSS} grid-column: ${TRACK_COL[t]};`;
          hdrEl.style.order = mobileOrderMap.get(item);
          const text = item.Event.replace(/^session\s+\d+:\s*/i, "");
          hdrEl.innerHTML = `<span class="sess-title">${text}</span>${item.Speaker ? `<span class="sess-chair">${item.Speaker}</span>` : ""}`;
          grid.appendChild(hdrEl);
        });
      } else {
        const jClass = isFull ? "full" : track.toLowerCase();
        const colCSS = isFull ? "grid-column: 2 / -1;" : `grid-column: ${TRACK_COL[track]};`;
        const hdrEl = document.createElement("div");
        hdrEl.className = `sess-hdr ${jClass}`;
        hdrEl.style.cssText = rowCSS + colCSS;
        hdrEl.style.order = mobileOrderMap.get(item);
        const text = item.Event.replace(/^session\s+\d+:\s*/i, "");
        hdrEl.innerHTML = `<span class="sess-title">${text}</span>${item.Speaker ? `<span class="sess-chair">${item.Speaker}</span>` : ""}`;
        grid.appendChild(hdrEl);
      }
      return;
    }

    // Full-width cards
    if (isFull) {
      const cls = isEnd ? "sc-adjourn"
        : (track === "Break" || track === "Food" || track === "Start" || track === "Train" || track === "Photo") ? "sc-break"
        : "sc-plen";
      const mTrack = track === "Break" ? "Break" : "Plenary";
      const fullEl = document.createElement("div");
      fullEl.className = `sc ${cls}${item.Highlight === "yes" ? " sc-highlight" : ""}`;
      fullEl.dataset.mobileTrack = mTrack;
      fullEl.style.cssText = `${rowCSS} grid-column: 2 / -1;`;
      fullEl.style.order = mobileOrderMap.get(item);
      fullEl.innerHTML = cardInnerHTML(item, null);
      grid.appendChild(fullEl);
      return;
    }

    // Joint track cards
    if (joints) {
      const sortedJoints = [...joints].sort((a, b) => TRACK_PRIORITY[a] - TRACK_PRIORITY[b]);
      sortedJoints.forEach((t, idx) => {
        const jointEl = document.createElement("div");
        jointEl.className = `sc sc-${t.toLowerCase()}${idx > 0 ? " joint-secondary" : ""}${item.Highlight === "yes" ? " sc-highlight" : ""}`;
        const partner = sortedJoints.filter(p => p !== t)[0];
        jointEl.dataset.mobileTrack = `${track} (joint)`;
        jointEl.style.cssText = `${rowCSS} grid-column: ${TRACK_COL[t]};`;
        jointEl.style.order = mobileOrderMap.get(item);
        jointEl.innerHTML = cardInnerHTML(item, partner);
        grid.appendChild(jointEl);
      });
      return;
    }

    // Single track card
    const singleEl = document.createElement("div");
    singleEl.className = `sc sc-${track.toLowerCase()}${item.Highlight === "yes" ? " sc-highlight" : ""}`;
    singleEl.dataset.mobileTrack = track;
    singleEl.style.cssText = `${rowCSS} grid-column: ${TRACK_COL[track]};`;
    singleEl.style.order = mobileOrderMap.get(item);
    singleEl.innerHTML = cardInnerHTML(item, null);
    grid.appendChild(singleEl);
  });

  pane.appendChild(hdr);
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
      Day:       row["Day"]      || "",
      Track:     row["Track"]    || "",
      Time:      row["Time"]     || "",
      Dur:       row["Duration"] || "",
      Event:     row["Title"]    || row["Event"] || "",
      Speaker:   row["Speaker"]  || "",
      Affil:     row["Affil"]    || "",
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
