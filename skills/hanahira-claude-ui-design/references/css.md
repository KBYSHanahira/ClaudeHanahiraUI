# CSS: architecture, responsive technique, bugs and performance

A look-up for when writing or repairing styles. Follow the project's existing approach first — its framework, naming, file layout and tokens. What follows is for when there is a choice, and for finding what is wrong.

## Tokens

Every design decision lives once, as a custom property, in two layers:

```css
:root {
  /* raw values */
  --gray-50: oklch(98% 0.005 80);   --gray-900: oklch(22% 0.01 80);
  --space-1: 0.25rem;  --space-2: 0.5rem;  --space-4: 1rem;  --space-6: 1.5rem;
  --radius-m: 0.5rem;

  /* roles — components use only these */
  --color-bg: var(--gray-50);
  --color-text: var(--gray-900);
  --color-accent: oklch(58% 0.15 35);
}
@media (prefers-color-scheme: dark) {
  :root { --color-bg: var(--gray-900); --color-text: var(--gray-50); }
}
```

Components refer to roles, never to raw values, so a theme changes in one place. A value that appears twice in the stylesheet should be a token; a value off the scale needs a reason.

## Architecture

- **Keep specificity low and flat.** Single classes; no IDs for styling; avoid nesting deeper than two levels. Most "CSS fights" are specificity fights.
- **Cascade layers** make the order explicit: `@layer reset, tokens, base, components, utilities;` — a later layer wins whatever the selector.
- **`!important` is a last resort** for utilities and for overriding third-party styles, not a way to win an argument with my own CSS. If it seems needed, find what is overriding and why.
- **Scope styles to components** by the project's means: CSS modules, scoped styles, a naming convention, or `@scope`.
- **Logical properties** (`margin-inline`, `padding-block`, `inset-inline-start`) so layouts work in right-to-left scripts.
- **Units**: `rem` for type and spacing (respects the user's settings), `em` for things that should scale with their own text, `%`/`fr`/`ch` for layout, `px` for hairlines.

## Layout

- **Grid for two dimensions, flex for one.** `gap` for spacing between items, not margins on children.
- **Intrinsic layouts need no breakpoints**:
  ```css
  .cards { display: grid; gap: var(--space-4);
           grid-template-columns: repeat(auto-fit, minmax(min(18rem, 100%), 1fr)); }
  ```
- Let content set sizes; avoid fixed heights on anything containing text. Use `min-height`, `aspect-ratio`, `max-width`.
- Centre a page column with `max-width` + `margin-inline: auto` + `padding-inline`.

## Responsive, from phone to TV

- **Smallest first.** Base styles are the narrow layout; `min-width` queries add to it. Put breakpoints where the content stops working, not at device names.
- **Container queries** (`container-type: inline-size` + `@container`) let a component respond to the space it is given, which is what a reusable component needs.
- **Fluid values** with `clamp()` for type and spacing between a minimum and a maximum.
- **The viewport meta tag** must be present: `<meta name="viewport" content="width=device-width, initial-scale=1">`. Never disable zoom.
- **Viewport height**: `100vh` is wrong on mobile browsers with collapsing toolbars; use `100dvh` (with `100vh` as a fallback).
- **Safe areas** on notched phones: `padding: env(safe-area-inset-top) ...`.
- **Input type, not screen size, decides hover**: `@media (hover: hover) and (pointer: fine)`. Touch targets are at least 44×44px with space between them.
- **Images**: `max-width: 100%; height: auto`, with `width` and `height` attributes so space is reserved; `srcset`/`sizes` or `<picture>` to send an appropriate file.
- **Tables** on narrow screens: let the table scroll horizontally inside its own container, or restack rows as cards — the page itself never scrolls sideways.
- **Large screens and TV**: cap line length and content width instead of stretching; scale type and spacing up for viewing distance (a rough guide: body text about twice the desktop size at ten feet); keep content away from the edges (around 5% overscan margin); strong contrast, no thin weights; every interactive element reachable with arrow keys in a predictable order and with a very visible focus state — there is no pointer.

## Finding a style bug

Use the browser's developer tools before changing code; they show the answer.

| Symptom | Look for |
|---|---|
| A rule "does not apply" | The Styles panel shows it struck through: something more specific, later, or in a later layer wins. Or the selector does not match — check the actual DOM. Or the property is invalid for that element |
| Page scrolls sideways | One element wider than the viewport. Find it: `* { outline: 1px solid red }`, or in the console look for elements whose `getBoundingClientRect().right` exceeds `innerWidth`. Usual causes: a fixed width, `100vw` (which includes the scrollbar), long unbroken text, negative margins |
| Flex or grid child overflows or will not shrink | Flex and grid items default to `min-width: auto`. Set `min-width: 0` (or `min-height: 0`) on the item |
| `z-index` has no effect | The element is in a different stacking context. A parent with `transform`, `opacity < 1`, `filter`, `position` + `z-index`, `isolation` or `contain` creates one; z-index only competes inside it |
| `position: sticky` does not stick | An ancestor has `overflow` other than visible, or the element has no `top`, or its parent is only as tall as itself |
| `height: 100%` does nothing | The parent has no definite height |
| Margins behave oddly | Vertical margins collapse between siblings and between parent and first child. Use `gap` or padding |
| Text is cut off or overlaps | A fixed height or a tight line height, especially with Thai marks. Remove the height; raise the line height |
| Looks different in another browser | Check support for the feature; add a fallback or `@supports` |
| Layout jumps when loading | Images without dimensions, late-loading fonts, content injected above. Reserve the space |

Change one thing at a time in the tools, confirm it fixes the symptom, then write it into the source — at the cause, not as an override on top.

## Performance

Measure with the browser's performance panel and Lighthouse, on a throttled connection and a mid-range phone profile — not on a developer machine on fibre. The numbers people feel:

- **Largest Contentful Paint** (main content visible): aim under 2.5s. Send the main image early (`fetchpriority="high"`, no lazy-loading on it), in a modern format (AVIF/WebP) at the right size; inline or prioritise the CSS for the first screen; do not block rendering with scripts (`defer`, `type="module"`).
- **Cumulative Layout Shift** (things jumping): aim under 0.1. Give images, video, embeds and ad slots dimensions or `aspect-ratio`; reserve space for anything loaded late; tune fallback fonts.
- **Interaction to Next Paint** (response to input): aim under 200ms. Keep long JavaScript tasks off the main thread, break up work, avoid layout thrashing (reading layout then writing style in a loop).

And:

- Animate only `transform` and `opacity`; they do not trigger layout. `will-change` sparingly, removed afterwards.
- `loading="lazy"` on images and iframes below the first screen; `content-visibility: auto` for long off-screen sections.
- Ship less: remove unused CSS and JavaScript, split by route, compress (Brotli), cache static files with hashed names for a long time.
- Fonts: WOFF2, subset, few files, `font-display: swap`.
- Large `box-shadow`, `filter: blur()` and `backdrop-filter` over big areas are expensive to paint, especially on phones.

Report performance as numbers before and after, measured the same way.
