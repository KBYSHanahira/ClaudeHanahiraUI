# CSS implementation — architecture, skeleton, bug prevention, verification

Read once per conversation (again if it has left context) when the task produces or debugs CSS (or Tailwind / scoped styles / CSS-in-JS). Design decisions come from `SKILL.md`; this file turns them into stylesheets that don't break.

## CSS architecture that cannot drift

**One source of truth.** Every colour, size, radius, shadow, duration, and z-index is a custom property on `:root`. Component rules reference tokens only. A literal colour (`#…`, `rgb()`, `hsl()`, `oklch()`…), length (`px`, `rem`) or duration (`ms`, `s`) inside a component rule is a defect to fix, not a shortcut.

**Flat specificity.** Single class selectors for components (`.card`, `.card-title`), state as a second class or attribute (`.card.is-active`, `[aria-expanded="true"]`). No IDs in selectors, no `!important` (the one exception is the reduced-motion kill switch in the reset), no element-qualified classes (`div.card`), no descendant chains deeper than two. When two rules fight, the fix is the cascade layer or the class name — never a heavier selector.

**Cascade layers**, so order is explicit and a late utility never loses to an early component:

```css
@layer reset, tokens, base, layout, components, utilities;
```

**Tokens are semantic, not literal.** `--color-accent`, not `--color-orange`; `--space-4`, not `--space-16px`. Semantic names survive a palette change; literal names lie after it.

**Z-index is a scale, not a guess**: `--z-base: 0; --z-raised: 10; --z-sticky: 100; --z-overlay: 1000; --z-modal: 1100; --z-toast: 1200`. Anything not on the scale is a bug (when one "doesn't work": the bug table below).

**Frameworks**: Tailwind — check the installed major first. v4: tokens in CSS `@theme { --color-accent: … }`, no `tailwind. v4 makes utilities only from its namespaces (`--color-*`, `--font-*`, `--text-*`, `--leading-*`, `--tracking-*`, `--spacing-*`, `--radius-*`, `--shadow-*`, `--ease-*`, `--breakpoint-*`): rename `--space-*` to `--spacing-*`; z and duration tokens stay in plain `:root`.config` by default, safelist via `@source inline("…")`. v3: tokens in `tailwind.config` theme, `safelist` there. Both: arbitrary values (`w-[347px]`) are magic numbers, `h-screen` → `h-svh` (heroes) or `h-dvh` (app shells), class names assembled at runtime get purged — write full literal class strings. Scoped styles (Vue `<style scoped>`, CSS Modules) — tokens still live globally on `:root`; only component rules are scoped. CSS-in-JS — same token discipline; the theme object is `:root`.

## Skeleton

`assets/skeleton.css` is the starting stylesheet for a new design with no existing stylesheet (never inside an existing design or a Tailwind project — SKILL.md *Spec gate*). TV or old-WebView targets: check the engine first — below Chromium 99 / Safari 15.4 there is no `@layer` (write the layers in order without it), below Chromium 111 / Safari 16.2 no `color-mix` (give `--color-border`, `--color-border-control` and `--color-muted` static values).

Copy it whole, fill every empty value from the spec (an empty token left in ships invisible text or zero spacing), then write components in the `components` layer referencing tokens only. Don't retype it from memory — the reset lines are there because each one prevents a specific bug in the table below.

Dark mode: uncomment the skeleton's dark blocks (its comment says how). A toggle sets `data-theme` from storage in an inline `<head>` script before first paint, or the page flashes the wrong theme.

The primitives compose almost every page. Reaching for a bespoke flex/grid rule on a component usually means a primitive should be used instead.

## Style-bug prevention

Each row is a bug that ships constantly in generated CSS, and the rule that makes it impossible. Apply the rule up front; don't wait to see the bug.

```
horizontal scroll on mobile      never any *vw unit for full width (vw/dvw/svw all ignore the scrollbar) → width:100%, or full-bleed
                                 margin-inline:calc(50% - 50cqi) under a container-type:inline-size ancestor (the content wrapper, never an
                                 ancestor of fixed or overlay UI — it traps them); flex/grid children min-width:0;
                                 long URLs/code get overflow-wrap:anywhere on that element only (not on Thai text); images max-width:100%
100vh too tall on mobile         100svh for full-screen sections and heroes; 100dvh only for app shells or overlays that must track the
                                 toolbar; never 100vh
text truncation fails            min-width:0 on the flex/grid child + overflow:hidden + white-space:nowrap + text-overflow:ellipsis
                                 (multi-line: display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:N; overflow:hidden)
grid column blowout              1fr → minmax(0,1fr) when content can be wide (tables, code, URLs)
margins collapse unpredictably   use gap and padding-block for rhythm; margins only inside .prose (skeleton: .prose > * + *)
z-index does nothing             element not positioned (static, not a flex/grid item) → position:relative; else an ancestor's
                                 transform/filter/opacity/contain/container-type makes a stacking context → move the element or drop it
position:sticky does nothing     no top/bottom value; parent only as tall as the element (sticky stays inside its parent); an ancestor
                                 with overflow:hidden/auto becomes the scroll container → overflow:clip on it, or move the overflow
position:fixed jumps             an ancestor has transform, filter, will-change, contain or container-type → fixed becomes relative to
                                 it; portal the element to body
images stretch or squash         width/height attributes + height:auto (in the skeleton reset); object-fit:cover + aspect-ratio only when
                                 cropping into a fixed slot; display:block kills the baseline gap
layout shift on load             images/embeds sized before load; fonts with size-adjust fallbacks; skeletons for async content
FOIT / text invisible on load    font-display:swap, preload the 1–2 critical files, fallback stack with matching metrics (size-adjust)
fonts look bold on Mac only      -webkit-font-smoothing:antialiased in reset; weights actually loaded (400 faux-bolded to 700 is the tell)
line-height with units           unitless only (1.5, not 24px) — units don't scale with nested font sizes
hover styles stick on touch      wrap hover in @media (hover:hover) and (pointer:fine)
focus ring missing               never outline:none without a :focus-visible replacement; ring must be ≥2px and ≥3:1 against ground
transition:all                   list the properties; which ones may animate: SKILL.md *Performance*
blurry text after transform      translate to whole pixels; drop scale on text; never will-change on more than 1–2 elements
icons wrong colour               SVG fill/stroke = currentColor; size with width/height, not font-size
buttons/inputs inherit nothing   font:inherit; color:inherit in reset (already in skeleton)
container query ignored          the ancestor needs container-type:inline-size; @container reads that, not the viewport
clamp() misbehaves               min > max (min wins); middle value includes rem (1rem + 2vw), never pure vw, or text won't zoom; and max ≤ 2.5× min, or 200% zoom fails WCAG 1.4.4
iOS notch overlaps content       padding with env(safe-area-inset-*) on fixed bars; viewport-fit=cover in the meta tag
dark mode form controls wrong    color-scheme:dark on :root so native controls, scrollbars, and autofill switch
dark images glare                img { filter: brightness(.9) } under dark scheme, or supply dark variants; borders replace shadows
Thai marks clipped               line-height ≥1.6 body; never overflow:hidden on a line box tighter than 1.4; Latin-only face falling
                                 back to system Thai
Thai + Latin uneven size/baseline a family with a matched Latin; size-adjust the Latin fallback down 3–5% for size,
                                 ascent-override/descent-override for the baseline
selectors cancel each other      a parent-scoped rule (.section > * margins) vs a component rule (.cta margin) → move one to the
                                 layer that should win; check computed styles
print looks broken               @media print: hide nav/fixed bars, black text, expand links (a[href]::after{content:attr(href)})
janky scroll or animation        which properties animate — see transition:all row; backdrop-filter over large areas
```

## Verify the render

Design is verified by measurement, not by re-reading the CSS. Run what the environment allows; report what could not be run.

**Overflow and layout** — in the browser console at 320px and 1280px:

```js
(() => { const w = document.documentElement.clientWidth; const clipped = e => { for (let p = e.parentElement; p && p !== document.documentElement; p = p.parentElement) if (getComputedStyle(p).overflowX !== 'visible') return true; return false }; return { pageOverflows: document.documentElement.scrollWidth > w, sources: [...document.body.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > w + .5 && !clipped(e) }).map(e => e.tagName + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).join('.') : '')) } })()
```

If body or html has `overflow-x:hidden/clip`, remove it before running — it masks overflow rather than fixing it.

`pageOverflows: true` means the page scrolls sideways. `sources` lists the elements whose box runs past the viewport and that no ancestor clips — an intentional `overflow-x: auto` scroller is skipped, and so are its contents. Expect `{ pageOverflows: false, sources: [] }`.

**Fonts actually loaded:**

```js
document.fonts.ready.then(() => console.log([...document.fonts].map(f => `${f.family} ${f.weight} ${f.status}`)))
```

Every weight used in CSS should show `loaded`. A weight that isn't listed is being faux-bolded.

**Contrast, measured:**

```js
(() => {
const cx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
const paint = (c, base) => { cx.fillStyle = `rgb(${base})`; cx.fillRect(0, 0, 1, 1); cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); return [...cx.getImageData(0, 0, 1, 1).data].slice(0, 3) };
const L = rgb => { const [r, g, b] = rgb.map(v => v / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * r + .7152 * g + .0722 * b };
const bgOf = e => { const chain = []; for (let n = e; n; n = n.parentElement) chain.unshift(n); return chain.reduce((bg, n) => paint(getComputedStyle(n).backgroundColor, bg), [255, 255, 255]) };
return [...document.body.querySelectorAll('*')].filter(e => !/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(e.tagName) && e.checkVisibility?.() !== false)
  .filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))
  .map(e => { const s = getComputedStyle(e), bg = bgOf(e), fg = paint(s.color, bg), [x, y] = [L(fg), L(bg)].sort((p, q) => q - p);
    const big = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && +s.fontWeight >= 700);
    return { el: e.tagName + (e.id ? '#' + e.id : ''), ratio: +((x + .05) / (y + .05)).toFixed(2), need: big ? 3 : 4.5 } })
  .filter(r => r.ratio < r.need) })()
```

Returns every text element below its threshold — 4.5:1, or 3:1 for large text (≥ 24px, or ≥ 18.66px and bold). It composites every ancestor's background, translucent layers included, and the text's own alpha, and accepts any colour syntax the browser parses (hex, `rgb()`, `oklch()`, `color-mix()`). Not measured: text over images or gradients, input values and placeholders, `::before`/`::after` text — check those by eye or sample the pixels. Expect `[]`.

**Token discipline** — grep the stylesheet for literals that should be tokens:

```bash
awk '/@layer (reset|tokens) *\{/{s=1;d=0} s{d+=gsub(/\{/,"{");d-=gsub(/\}/,"}");if(d<=0)s=0;next} {print NR": "$0}' styles.css \
  | grep -E '#[0-9a-fA-F]{3,8}([^0-9a-zA-Z_-]|$)|[0-9.]+(px|rem|ms|s)([^a-zA-Z0-9_-]|$)|(rgba?|hsla?|hwb|lab|lch|oklab|oklch)\('
```

Skips the `reset` and `tokens` layers (block form) and prints every literal left elsewhere with its line number — each is a drift, except media-query breakpoints (custom properties can't go there).

**Motion grep** — `grep -nE 'transition|animation|@keyframes' styles.css`: no `all`, no layout property animated, and a reduced-motion path exists (the reset's kill switch, or a `prefers-reduced-motion` block).

**Tap targets and images** — in the console; `min` is 44 for touch, 24 for dense desktop. Inline links inside sentences are exempt; judge the rest:

```js
((min = 44) => ({ smallTargets: [...document.querySelectorAll('a,button,input,select,textarea,[role=button],[tabindex]')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.width < min || r.height < min) }).map(e => e.tagName + ' ' + (e.textContent || e.name || '').trim().slice(0, 30)), images: [...document.images].filter(i => !i.getAttribute('width') || !i.getAttribute('height') || !i.hasAttribute('alt')).map(i => i.currentSrc || i.src) }))()
```

Expect both lists empty (or only exempt inline links).

**Stacking and sticky** — if a `z-index` or `position: sticky` misbehaves, find the trapping ancestor — each entry is an ancestor and why it traps `position: fixed`, caps a `z-index`, or clips `position: sticky`:

```js
(() => { const out = []; let e = document.querySelector('.the-element'); while ((e = e.parentElement)) { const s = getComputedStyle(e); const why = [s.transform !== 'none' && 'transform', s.filter !== 'none' && 'filter', s.backdropFilter !== 'none' && 'backdrop-filter', s.perspective !== 'none' && 'perspective', s.willChange !== 'auto' && 'will-change', s.contain !== 'none' && 'contain', s.containerType && s.containerType !== 'normal' && 'container-type:' + s.containerType, s.isolation === 'isolate' && 'isolation', s.mixBlendMode !== 'normal' && 'mix-blend-mode', s.opacity !== '1' && 'opacity', /hidden|auto|scroll|clip/.test(s.overflow) && 'overflow:' + s.overflow].filter(Boolean); if (why.length) out.push([e.tagName + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).join('.') : ''), ...why]) } return out })()
```

**Screenshots** — when a browser tool exists, capture 360 and 1280 (and 1920 for marketing pages), light and dark if both are shipped. Look for: clipped text, orphaned elements, uneven rhythm, the signature element not reading as the signature.

**No browser available** — say so in one line, and list the checks above for the user to run. Never report "verified" for something that was only read.

