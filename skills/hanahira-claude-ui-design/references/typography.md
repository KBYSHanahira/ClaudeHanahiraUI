# Typography

A look-up for when choosing fonts, building a type scale, or setting text in Thai, Japanese, Chinese, Korean or mixed scripts. Most of an interface is text; getting type right is most of getting the design right.

## Choosing fonts

- **At most two families**: one for reading, and optionally one for display. A third needs a strong reason (a monospace for code is the usual one).
- **Choose text faces for reading**: open shapes, clear difference between similar letters (`I l 1`, `O 0`), enough weights (regular, medium, bold at least), and real italics if italics are used.
- **Check coverage first.** The family must contain every script and character the product will show. When it does not, pick a companion face for the missing script whose weight, x-height and feel match, and name it explicitly in the font stack — otherwise the browser picks a fallback that does not match.
- **Licence**: confirm the font may be used the way the product uses it (web embedding, app bundling).
- **System fonts** are a real option: fast, familiar and well-hinted. `system-ui` gives each platform its own.

## Scale and measure

- A scale with few steps and a consistent ratio (for example 1.2 or 1.25): roughly 12 · 14 · 16 · 20 · 24 · 30 · 36 · 48. Use the steps; no in-between sizes.
- **Body**: 16px or larger on screens. Small text (12–13px) only for secondary labels, never for anything that must be read.
- **Line height**: about 1.5 for body text, 1.1–1.3 for large headings — the larger the text, the tighter. Unitless values, so it scales.
- **Line length**: 45–75 characters for Latin body text (`max-width: 65ch`). Long lines are the most common reason text feels hard to read.
- **Weight and colour** make hierarchy with fewer sizes: a medium-weight label and a muted caption can share one size.
- **Fluid type**: `font-size: clamp(1rem, 0.9rem + 0.5vw, 1.25rem)` scales between limits without breakpoints. Always in `rem`, so user zoom and font-size settings work.

## Details that show care

- Left-align body text (for left-to-right scripts). Justified text on the web produces rivers; centred text suits a line or two, not paragraphs.
- Tabular figures for numbers in columns: `font-variant-numeric: tabular-nums`.
- Real quotation marks, apostrophes, dashes and ellipses, as the language uses them.
- All-caps text gets a little letter-spacing (about 0.05em); large headings often get slightly negative spacing. Body text gets none.
- `text-wrap: balance` for headings and `text-wrap: pretty` for paragraphs avoid lonely last words.
- Never fake bold or italic: load the real weight or do without (`font-synthesis: none`).

## Thai

Thai behaves differently from Latin in ways that break layouts designed only with English.

- **Vertical space.** Thai stacks vowels and tone marks above the consonant and vowels below it — up to two levels above. A line height that suits English clips or collides: use about **1.6–1.8** for body text, and check headings at the tightest line height used. Give single-line elements (buttons, inputs, table cells, badges) enough height and padding that upper and lower marks are not cut; never set `overflow: hidden` on a tight line box.
- **No letter-spacing.** Extra tracking pulls marks away from their consonants and breaks the reading. Set `letter-spacing: 0` for Thai, including in uppercase-styled labels, which have no meaning in Thai anyway.
- **No spaces between words.** Words run together; spaces mark phrases and sentences. Browsers break lines using a dictionary, which works well when the element has the right language: mark it `lang="th"`. As a safety net for long unbroken strings, `overflow-wrap: anywhere` with `word-break: normal`. Insert a zero-width space (`&#8203;`) or `<wbr>` to suggest a break in a long compound or a product name. Never `word-break: break-all` — it breaks inside words and separates marks from consonants.
- **Looped and loopless.** Traditional Thai letters have small loops ("มีหัว"); modern display faces often drop them ("ไม่มีหัว"). Looped faces read more easily at small sizes and in long text — use them for body. Loopless faces suit headings and brand moments, where their modern feel reads as intended.
- **Size.** Thai letterforms look smaller than Latin at the same size in many fonts. When the two share a line, choose a Thai face whose letter height matches the Latin companion, or set Thai body text one notch larger than the Latin body (16px minimum; add that size to the scale as a named step rather than using it ad hoc).
- **Weights.** Bold Thai fills in at small sizes; prefer medium or semibold for emphasis in body text.
- **Fonts with good Thai**, as starting points: looped, for reading — Noto Sans Thai Looped, IBM Plex Sans Thai Looped, Sarabun; loopless, for headings and UI — Noto Sans Thai, IBM Plex Sans Thai, Prompt, Kanit, Anuphan. Check the current licence and the weights available.
- **Font stack**: put the Latin face first when it should render Latin characters, then the Thai face, then fallbacks — `font-family: "Inter", "Noto Sans Thai Looped", system-ui, sans-serif;` — and confirm the two look like they belong together.
- **Numerals and dates.** Arabic digits are standard in interfaces; Thai digits (๐–๙) appear in formal and government contexts. Dates may be in the Buddhist Era (BE = CE + 543): show the era the audience expects and never mix them silently.
- **Truncation.** Cutting Thai text at a fixed character count can separate a mark from its consonant. Truncate with CSS (`text-overflow: ellipsis`, `line-clamp`) so the browser cuts at a safe point.
- **Sorting and searching** Thai uses a collation that treats leading vowels correctly; use the platform's locale-aware comparison (`Intl.Collator('th')`), not code-point order.

## Japanese, Chinese, Korean

- **Line height** about 1.7–1.8 for body; characters are dense and square.
- **Line length** shorter than Latin: about 25–40 full-width characters.
- **No italics** — they do not exist in these scripts; emphasise with weight, colour or emphasis marks. Avoid letter-spacing in body text.
- **Line breaking** follows rules about which characters may start or end a line: `line-break: strict` (Japanese), `word-break: keep-all` for Korean so words do not split.
- **Language tags matter**: the same code point is drawn differently in Japanese, Simplified Chinese, Traditional Chinese and Korean. Mark `lang="ja"`, `zh-Hans`, `zh-Hant`, `ko`, and name the right font for each.
- **Font files are large** (thousands of glyphs): use system fonts, or subset and split with `unicode-range`.
- **Mixed with Latin**: Latin letters and digits inside CJK text look best in a Latin face listed first in the stack, sized to sit with the CJK characters.

## Loading fonts

- Serve WOFF2, self-hosted where possible, subset to the scripts used.
- `font-display: swap` shows text at once in a fallback; reduce the jump by tuning the fallback with `size-adjust` and `ascent-override` so the swap moves nothing.
- Preload only the one or two files needed for the first screen.
- Variable fonts give every weight in one file — often smaller than three static files.

## Check

Set real content in every language the product supports, at the smallest and largest sizes, and look: nothing clipped above or below, no mismatched fallback glyphs, line breaks in sensible places, numbers aligned, and the page still readable at 200% zoom.
