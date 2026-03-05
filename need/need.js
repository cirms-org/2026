// need.js — CIRMS 2026 Need Slide Generator
//
// Renders the sentence template onto a 1920×1080 canvas in real time as
// the speaker fills in the three blanks, then exports it as a PNG for
// insertion into any presentation software.

// ── Canvas constants ──────────────────────────────────────────────────────────

const W         = 1920;
const H         = 1080;
const PAD       = 88;              // left/right margin
const HEADER_H  = 230;             // blue header bar height
const FONT_SIZE = 54;              // sentence font size (px)
const LINE_H    = 94;              // line height
const CONTENT_Y = HEADER_H + 180; // top of sentence block
const HP        = 24;              // highlight box internal horizontal padding
const BM        = 16;              // margin between box edge and surrounding text
const VP        = 8;               // highlight box vertical padding
const RR        = 7;               // highlight box corner radius
const BOX_H     = FONT_SIZE + VP * 2;          // highlight box height (constant)
const BLANK     = '\u00a0'.repeat(10);          // placeholder for empty fields

// Colour palette — mirrors CSS variables in need.css
const C = {
  blue:     '#001f4f',
  bg:       '#e2e8f5',
  text:     '#334155',
  muted:    '#94a3b8',
  highBg:   '#ffffde',
  highBord: '#b8940a',
  white:    '#ffffff',
};

// ── Canvas setup ──────────────────────────────────────────────────────────────

const canvas = document.getElementById('slidePreview');
const ctx    = canvas.getContext('2d');
canvas.width  = W;
canvas.height = H;

// ── Helpers ───────────────────────────────────────────────────────────────────

function rrect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Token layout ──────────────────────────────────────────────────────────────
//
// Each token carries:
//   textWidth — raw measured text width, used for text placement
//   slotWidth — total horizontal space consumed in the line:
//               plain     → textWidth
//               filled hl → textWidth + 4px trailing gap
//               blank hl  → textWidth + HP*2 (internal) + BM*2 (outer margins)
//
// Drawing a blank highlight token at position cx:
//   box  starts at cx + BM
//   text starts at cx + BM + HP
//   cx advances by slotWidth

function flow(segments, maxWidth) {
  const tokens = [];
  ctx.letterSpacing = '-0.5px';

  segments.forEach(seg => {
    if (seg.highlight) {
      ctx.font = `700 ${FONT_SIZE}px "DM Sans", sans-serif`;
      if (seg.isBlank) {
        // Blank placeholder — keep atomic so the box renders correctly
        const tw = ctx.measureText(seg.text).width;
        tokens.push({ text: seg.text, highlight: true, isBlank: true, textWidth: tw, slotWidth: tw + HP * 2 + BM * 2 });
      } else {
        // Filled text — split at word boundaries so long phrases wrap naturally
        seg.text.split(/(\s+)/).forEach(chunk => {
          if (!chunk) return;
          const tw = ctx.measureText(chunk).width;
          const isSpace = /^\s+$/.test(chunk);
          tokens.push({ text: chunk, highlight: !isSpace, isBlank: false, textWidth: tw, slotWidth: tw + 4 });
        });
      }
    } else {
      seg.text.split(/(\s+)/).forEach(chunk => {
        if (!chunk) return;
        ctx.font = `400 ${FONT_SIZE}px "DM Sans", sans-serif`;
        const tw = ctx.measureText(chunk).width;
        tokens.push({ text: chunk, highlight: false, textWidth: tw, slotWidth: tw });
      });
    }
  });

  const lines   = [[]];
  let lineWidth = 0;

  tokens.forEach(tok => {
    const isSpace = !tok.highlight && /^\s+$/.test(tok.text);
    if (!isSpace && lineWidth + tok.slotWidth > maxWidth && lines[lines.length - 1].length > 0) {
      lines.push([]);
      lineWidth = 0;
    }
    if (isSpace && lines[lines.length - 1].length === 0) return;
    lines[lines.length - 1].push(tok);
    lineWidth += tok.slotWidth;
  });

  return lines;
}

// ── Main render ───────────────────────────────────────────────────────────────

function renderSlide() {
  const area       = document.getElementById('f-area').value.trim();
  const standard   = document.getElementById('f-standard').value.trim();
  const capability = document.getElementById('f-capability').value.trim();

  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  // Blue header bar
  ctx.fillStyle = C.blue;
  ctx.fillRect(0, 0, W, HEADER_H);

  ctx.fillStyle = C.white;
  ctx.font = '600 70px "DM Sans", sans-serif';
  ctx.fillText('CIRMS 2026 \u2014 Need', PAD, 128);

  ctx.fillStyle = C.muted;
  ctx.font = '400 33px "DM Sans", sans-serif';
  ctx.fillText('Annual Meeting  \u00b7  April 13\u201315, 2026', PAD, 190);

  // Sentence
  ctx.letterSpacing = '-0.5px';
  const segments = [
    { text: 'Progress in ',                            highlight: false },
    { text: area       || BLANK, isBlank: !area,       highlight: true  },
    { text: ' is currently blocked because we lack ',  highlight: false },
    { text: standard   || BLANK, isBlank: !standard,   highlight: true  },
    { text: ', which prevents ',                       highlight: false },
    { text: capability || BLANK, isBlank: !capability, highlight: true  },
    { text: '.',                                       highlight: false },
  ];

  const lines = flow(segments, W - PAD * 2);

  lines.forEach((line, li) => {
    const baseY = CONTENT_Y + li * LINE_H;
    const boxY  = baseY - FONT_SIZE * 0.82 - VP;
    let cx = PAD;

    // Pass 1 — boxes
    line.forEach(tok => {
      if (tok.highlight && tok.isBlank) {
        rrect(cx + BM, boxY, tok.textWidth + HP * 2, BOX_H, RR);
        ctx.fillStyle = C.highBg;
        ctx.fill();
        ctx.strokeStyle = C.highBord;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      cx += tok.slotWidth;
    });

    // Pass 2 — text
    cx = PAD;
    line.forEach(tok => {
      ctx.font      = `${tok.highlight ? '700' : '400'} ${FONT_SIZE}px "DM Sans", sans-serif`;
      ctx.fillStyle = tok.highlight ? C.blue : C.text;
      ctx.fillText(tok.text, (tok.highlight && tok.isBlank) ? cx + BM + HP : cx, baseY);
      cx += tok.slotWidth;
    });
  });
}

// ── Input listeners ───────────────────────────────────────────────────────────

['f-area', 'f-standard', 'f-capability'].forEach(id => {
  document.getElementById(id).addEventListener('input', renderSlide);
});

// ── Download ──────────────────────────────────────────────────────────────────

document.getElementById('btnDownload').addEventListener('click', () => {
  renderSlide();
  const a    = document.createElement('a');
  a.download = 'CIRMS2026_Need.png';
  a.href     = canvas.toDataURL('image/png');
  a.click();
});

// ── Initial render — explicitly preload all canvas font variants first ────────

Promise.all([
  document.fonts.load(`400 ${FONT_SIZE}px "DM Sans"`),
  document.fonts.load(`700 ${FONT_SIZE}px "DM Sans"`),
  document.fonts.load(`600 70px "DM Sans"`),
  document.fonts.load(`400 33px "DM Sans"`),
]).then(renderSlide);
