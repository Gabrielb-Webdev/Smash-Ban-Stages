# Santa Fe Overlay 2 — Enhancements Design

**Date:** 2026-04-29  
**Scope:** `control.html` + `overlay.html` (Santa Fe / Overlay 2)  
**Status:** Approved

---

## Overview

Four enhancements to the Santa Fe stream setup:

1. Auto-fill country/flagCode/seed in `control.html` from start.gg session data
2. Replace the "Código bandera" text input with a custom flag dropdown (images + search)
3. Character reveal animation using GSAP when a character is selected in the overlay
4. Glitch effect on the character render when a new match is sent to stream (until a character is picked)

---

## Files Changed

| File | Changes |
|------|---------|
| `public/overlays/Santa-fe/Overlay 2/control.html` | syncFromSession + flag dropdown |
| `public/overlays/Santa-fe/Overlay 2/overlay.html` | GSAP reveal + glitch state |

No changes to `_panel.js`, `server.js`, or any API route — the data pipeline already works correctly.

---

## Section 1 — Country / Seed Auto-fill in `control.html`

### Data already available

The `/api/santa-fe/stream-session` endpoint already returns:
```json
{ "country1": "Argentina", "flagCode1": "ar", "seed1": 3,
  "country2": "Spain",     "flagCode2": "es", "seed2": 1 }
```

`syncFromSession()` currently ignores these fields. We add:

```js
if (data.flagCode1) applyFlag(1, data.flagCode1);
if (data.flagCode2) applyFlag(2, data.flagCode2);
if (data.seed1)     document.getElementById('c-p1-seed').value = `SEED ${data.seed1}`;
if (data.seed2)     document.getElementById('c-p2-seed').value = `SEED ${data.seed2}`;
```

`applyFlag(p, iso2)` sets the dropdown value, the readonly country field (ISO-3), and the flag preview image.

### ISO-2 → ISO-3 mapping

Inline JS object in `control.html` (~180 entries). Examples:
- `ar` → `ARG`, `es` → `ESP`, `us` → `USA`, `br` → `BRA`, `mx` → `MEX`

### Country field

The "País" input becomes `readonly`. A small pencil icon next to it toggles `readonly` off so the operator can override manually if needed.

---

## Section 2 — Custom Flag Dropdown in `control.html`

Replaces the `<input type="text" id="c-p{n}-flagcode">` for both players.

### Structure

```
[flag img 20x20] [search input field]      ← visible always
───────────────────────────────────────────
[flag img] Argentina (ARG)                 ← dropdown list (shown on focus)
[flag img] Spain (ESP)
[flag img] ...filtered by typing...
```

### Behavior

- On focus → dropdown opens
- Typing filters by country name or ISO-2/3 code
- Clicking an item:
  - Sets the internal ISO-2 value
  - Updates the flag preview image
  - Sets the "País" field to ISO-3
  - Closes the dropdown
  - Calls `pushAll()` automatically
- Clicking outside → closes dropdown
- On `syncFromSession()` receiving `flagCode` → programmatically selects the matching item

### Country list

~180 countries. Same base as `bracket.js` `COUNTRY_TO_ISO`, extended with common missing entries. Each entry: `{ iso2, iso3, name }`.

---

## Section 3 — Character Reveal Animation in `overlay.html`

### GSAP setup

Load from existing local file:
```html
<script src="../Resources/Scripts/gsap.min.js"></script>
```

### State model

```js
const charState = { 1: 'empty', 2: 'empty' };
// 'empty'  → no char yet, show glitch
// 'glitch' → new match sent, char not picked yet
// 'ready'  → char selected, show render
```

### Glitch state (CSS `@keyframes`)

Applied when `charState[p] !== 'ready'`:

```css
@keyframes charGlitch {
  0%,  14% { transform: skewX(0deg) translateX(0);    filter: grayscale(1) opacity(0.35) hue-rotate(0deg); }
  15%       { transform: skewX(-6deg) translateX(4px); filter: grayscale(0) opacity(0.6)  hue-rotate(90deg) saturate(4); }
  17%       { transform: skewX(4deg)  translateX(-3px); }
  19%,100%  { transform: skewX(0deg) translateX(0);    filter: grayscale(1) opacity(0.35) hue-rotate(0deg); }
}
.char-glitch { animation: charGlitch 3s infinite; }
```

A `<div class="char-question">` overlaid on `.char-render` shows a styled `?` (white, bold, large, semi-transparent) while in glitch state.

### Reveal timeline (GSAP)

Triggered when `charState[p]` transitions to `'ready'`:

```
t=0.00  SET  → { opacity:0, y:50, scale:0.9, filter:'blur(12px)' }
t=0.00  TO   → { opacity:1, y:0, duration:0.55, ease:'power3.out' }
t=0.00  TO   → { filter:'blur(0px)', duration:0.35, ease:'power2.out' }  // parallel
t=0.45  TO   → { scaleX:1.06, duration:0.08 }                            // squish
t=0.53  TO   → { scaleX:1, duration:0.25, ease:'elastic.out(1, 0.4)' }   // bounce back
```

### Transition glitch → reveal

Before starting the GSAP timeline:
1. Fade out `.char-question` (CSS opacity 0, 150ms)
2. Remove `.char-glitch` class
3. Start timeline

---

## Section 4 — Trigger: "New match sent to stream"

When `overlay.html` receives a BroadcastChannel payload where `p1-char` is empty/null, `charState[1]` is set to `'glitch'` (and same for `p2`). This naturally happens when a new match is called from the admin panel because the server session resets `character: null`.

When `p1-char` has a value and it differs from the currently displayed char → trigger reveal animation.

---

---

## Section 5 — `overlay2.html` Integration

### What overlay2.html displays

Two pill rows (one per player), each with:
- Pronoun pill (e.g. "He/him")
- Seed pill (e.g. "SEED 2")
- Flag + country pill (flag image + ISO-3 text, e.g. "🇦🇷 ARG")

Currently all values are hardcoded. After this change they update live from `control.html`.

### Mechanism

`overlay2.html` subscribes to the same `BroadcastChannel('smash-scoreboard-v2')` already used by `overlay.html`. It also reads from `localStorage` on load (for cross-tab/cross-browser support), exactly like `overlay.html` does.

### New fields in `control.html`

Two pronoun inputs added to the player panels (below Twitter/Red social):

| Field ID        | Label       | Default  |
|----------------|-------------|----------|
| `c-p1-pronoun` | Pronombres  | He/him   |
| `c-p2-pronoun` | Pronombres  | He/him   |

These are included in `buildPayload()`:
```js
'p1-pronoun': document.getElementById('c-p1-pronoun').value,
'p2-pronoun': document.getElementById('c-p2-pronoun').value,
```

Swap players also swaps pronouns.

### overlay2.html DOM updates on payload receive

```js
// Pronombres
ov2p1pronoun.textContent = d['p1-pronoun'] || 'He/him';
ov2p2pronoun.textContent = d['p2-pronoun'] || 'He/him';
// Seed
ov2p1seed.textContent = d['p1-seed'] || '';
ov2p2seed.textContent = d['p2-seed'] || '';
// Bandera + país
ov2p1flag.src = d['p1-flag'] ? `https://flagcdn.com/w80/${d['p1-flag']}.png` : '';
ov2p1country.textContent = d['p1-country'] || '';
ov2p2flag.src = d['p2-flag'] ? `https://flagcdn.com/w80/${d['p2-flag']}.png` : '';
ov2p2country.textContent = d['p2-country'] || '';
```

IDs are added to the existing pill elements in `overlay2.html`.

---

## Files Changed (updated)

| File | Changes |
|------|---------|
| `public/overlays/Santa-fe/Overlay 2/control.html` | syncFromSession + flag dropdown + pronoun fields |
| `public/overlays/Santa-fe/Overlay 2/overlay.html` | GSAP reveal + glitch state |
| `public/overlays/Santa-fe/Overlay 2/overlay2.html` | BroadcastChannel listener + dynamic IDs |

---

## Out of Scope

- No changes to admin panel `_panel.js`
- No changes to server-side session structure
- No changes to other Santa Fe overlays
- No changes to other communities

---

## Self-Review

- No TBDs or incomplete sections
- Architecture is consistent across all sections
- Scope is 3 HTML files, all within the same directory
- ISO-3 codes are deterministic (standard ISO 3166-1 alpha-3)
- GSAP is already available locally — no CDN dependency added
- `overlay2.html` reuses the existing BroadcastChannel — no new communication layer needed
