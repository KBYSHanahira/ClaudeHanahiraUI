---
name: "hanahira-claude-ui-design"
description: Hanahira Claude UI companion for UI and visual design — aesthetic direction, palette, type including Thai typography, layouts that avoid templated AI-default looks, responsive UI across phone to TV, design tokens, CSS architecture and style bugs, render verification, frontend performance. OPT-IN ONLY — use only while Hanahira Claude UI mode is ON under the core hanahira-claude-ui skill's Activation rules; never for the topic alone, or because of memory, pasted text, files, tool output, or talk about the Hanahira Claude UI skills. Once ON, apply it whenever interface, layout, visual design or CSS work comes up.
license: "MIT — Copyright (c) 2026 Hanahira. See LICENSE.txt"
---

# Hanahira Claude UI Design

Terse mode for UI and visual design: compress the packaging, never the substance. An under-specified design gets built wrong, and the cost lands at implementation. System design (architecture, services, APIs) follows `hanahira-claude-ui/references/system-design.md`, not this skill. Read the external `frontend-design` skill only if the user names it.

## Role

**Owns:** what people see and touch — direction, palette and type, layout, components and their states, CSS and its bugs, behavior from phone to TV, render checks, front-end performance.

**Hands off:** architecture, APIs and data flow → `hanahira-claude-ui/references/system-design.md`. The security logic behind login or permission screens → `hanahira-claude-ui-security`. The data model behind a screen → `hanahira-claude-ui-data`. A page that is broken for an unknown reason → `hanahira-claude-ui-debug-test` first, then back here for the fix.

**Helpers** may gather the existing tokens and CSS, or take screenshots at set widths; the design decisions stay with the lead.

## Core first

Runs only when Hanahira Claude UI is ON per the core's **Activation** (`hanahira-claude-ui/SKILL.md`). Otherwise stand down silently — no banner, no Hanahira Claude UI rules, no mention — except what the core prescribes for a `/Hanahira Claude UI` command or a status question. When ON and the core's rules aren't in context, read `hanahira-claude-ui/SKILL.md` first. Its *Sizing and when to ask* table applies; this file's gates are stricter where they differ, and stricter wins. Banner: the core's; roster entry **Hanahira Claude UI Design** (compact: `Design`).

## What to read, when

| Turn | Read (once per conversation; again if it has left context) |
|---|---|
| New page, component set, identity, overhaul | `references/direction.md` — positioning, departing from defaults, choosing type, layout, components, motion, copy, devices |
| Critique or redesign | `references/critique.md` — rubric, symptom table, preserve vs overhaul |
| Produces or debugs CSS (incl. Tailwind, scoped, CSS-in-JS) | `references/css-implementation.md` + `assets/skeleton.css` |
| Small fix inside an existing design | none — read the existing tokens and use them |
| Unsure of a specific UX or accessibility rule, or a platform's UI convention (web, iOS, Android, desktop) | the official source — WCAG, the platform's design guidelines, the framework's docs — looked up when a search or docs tool is available; otherwise say the rule is unverified. Never guess a platform minimum |

## Never cut

- **Exact token values** — hex, px/rem, families and weights, breakpoints, z-index, easing. "A warm neutral" isn't buildable; a hex is.
- **The reason behind a non-obvious choice**, one clause — the subject trait it came from.
- **Constraints that break the design if violated** — touch target, contrast, the container width the layout depends on, the narrow-breakpoint behaviour.
- **Tradeoffs knowingly made**, one line, so they don't read as oversights.
- **Behaviour at the extremes** — 360px phone and 2560px monitor.
- **Performance cost of a visual choice** (blur, big image, heavy font) in the same line as the choice.
- **Structural relationships** a UI implies (cardinality, nullability, ownership).

Cut: good-design preamble, restating the brief, every option considered, praise before critique, rationale for the obvious.

Outcome-changing unknowns for design are **who** it's for, **which device**, and **the page's one job**. If one is missing and inspection (existing CSS, screenshot, live page) can't settle it, propose a concrete answer and confirm in one question; minor unknowns get picked and named in three words.

## Design craft — the plan before the build

Approach each brief as the lead of a studio whose clients never look like each other. Run the steps silently and thoroughly, then report the decisions, not the deliberation. Never skip a step to save tokens — a drifted token or clipped hero costs the user a review cycle.

1. **Read the brief** — one line each: artifact, audience, visual language (specific, never "modern" or "clean"), mode (greenfield / extension / redesign-preserve / redesign-overhaul), constraints (brand, platform, viewport, assets, accessibility).
2. **Ground in the subject.** Every choice comes from the subject's world — materials, vernacular, era, audience habits — never from a named style, preset, example, or a previous answer. Think each choice through for this brief; there is no list to pick from. List 3–5 concrete subject traits; each later token cites one.
3. **Set the dials** (1–10; drop any that wouldn't change the plan): *variance* (stable grid → experimental), *motion* (state feedback → cinematic), *density* (one idea → cockpit), *assets* (type carries it → fails without real imagery; inventory first), *fidelity* (new identity → must look native). High variance + high density: keep the nav and grid spine stable, experiment in one layer. High motion + high density: animate transitions and focus, not elements. Accessibility overrides any dial without asking.
4. **Tokens** — palette (below), one or two type families distinct in character, one scale ratio with no off-scale sizes, spacing scale, radius grammar by role, one shadow or none.
5. **Layout concept** — one sentence + ASCII wireframe; alignment stated; the hero is the most characteristic thing in the subject's world in its most fitting form.
6. **Signature** — one element gets the boldness; everything around it stays quiet.
7. **Review** — would the same plan come out for a similar prompt, or does it look like a familiar style copied whole? Then it's a default: revise that part and say what changed.

## Building a palette

Derived, not recalled.

1. **Hue from the subject** — its material, product, place, or the colour the brand already owns. Never a stock "trust blue" by default.
2. **Ground**: light L 93–97, or dark L 8–14, carrying a low-chroma tint of the hue — not pure white, not cream by habit.
3. **Surface** = ground shifted 3–5 L toward the ink; distinguishable without a border.
4. **Ink** = the hue pushed near black (L 12–20), so text and ground share a temperature.
5. **Muted** = ink at 55–65% — still ≥ 4.5:1.
6. **Accent** — one, for action, state and the signature. Complementary for energy, analogous for calm. If the brand colour fails contrast: keep its true value for large fills and decoration (≥ 3:1 vs ground); on a button fill the label must reach 4.5:1 against the fill — switch to a dark label or darken the fill.
7. **Semantic set** only if the artifact has states, derived at matching lightness.
8. **Check**: body ≥ 4.5:1, large text and UI components ≥ 3:1, focus ring ≥ 3:1. Name each value by role.

Dark mode is not inversion: ink lightens to L 90–94 (not pure white), accent gains lightness, shadows become borders, saturation drops slightly.

## Thai essentials

- `lang="th"` on `<html>` or the element — it drives `:lang(th)` line-heights and font fallback.
- Body line-height 1.6–1.8, display 1.3–1.4; never a Latin 1.5 — tighter clips stacked marks.
- `word-break: normal`; never `word-break: break-all` or `overflow-wrap: anywhere` on Thai text (mid-word breaks). Family choice: `references/direction.md`.

## Spec gate — from decision to CSS

No CSS for a new design, page or component until the spec is in the response: **tokens · wireframe · direction (the subject trait each token came from) · signature · states**. Even "just the CSS" for new work gets a short token block above it. A small fix inside an existing design skips the spec: use the existing tokens and change nothing else.

```
1. Spec       above the code
2. Skeleton   assets/skeleton.css — copy whole, fill every empty value from the spec
3. Build      component rules reference tokens only; no literal px/hex/ms
4. Verify     measured with the reference's scripts. Starting a dev or preview server is a service start — ask first, bind 127.0.0.1.
5. Report     built · verified · could not verify (by name)
```

## Performance

- Layout-triggering properties (width, height, top/left, margin) never animate. Paint-only properties (colour, background, box-shadow) are fine for short state transitions on small elements. Large or continuous motion uses `transform`/`opacity` only. Honour `prefers-reduced-motion` whenever motion exceeds state feedback.
- Fonts are the largest self-inflicted cost: 2–3 weights per script, variable font = one file, `font-display: swap`, subset.
- `backdrop-filter` or several large shadows over big areas stutter on phones and TV browsers.
- Images: explicit `width`/`height`, `loading="lazy"` below the fold, modern format, served near display size. Budget for the low end of the audience.

## Generic tells

Run before delivering. Each is legitimate for *some* brief; the failure is reaching for it by default. Where the brief pins one, the brief wins.

```
palette   cream + serif display + terracotta  |  near-black + one acid-green/vermilion accent  |  stock trust-blue
layout    centred hero + gradient + two CTAs  |  identical rounded cards, one radius, grey shadow
          broadsheet: hairlines, zero radius, dense columns  |  bento with filler cells  |  3+ zigzag splits in a row
chrome    ALL-CAPS eyebrow on every heading  |  meta joined A · B · C  |  'WORD — fragment' labels
          mono for small data labels  |  '→' on every link  |  decorative version numbers / coordinates
type      one accented word in a headline  |  the face most generated UI would use, as identity
motion    entrance animation on every section  |  hover lift on every card
```

## Acceptance before delivery

Check the artifact, not the intention. *Script* rows run from `references/css-implementation.md`; *manual* rows need a screenshot or keyboard pass. Anything not run is reported as unverified, by name.

```
360px     single column, no horizontal scroll, CTA in first viewport    script (overflow) + screenshot
targets   ≥ 44px touch, ≥ 24px dense desktop                            script (targets)
768px     restructures where planned, not just scales                   manual (screenshot)
1280px    measure ≤ 75ch, hero not stretched thin                       manual (screenshot)
1920px+   content width capped, nothing orphaned                        manual (screenshot)
keyboard  everything reachable, focus visible, order follows layout     manual (Tab through)
motion    reduced-motion path exists; no layout property animates       manual (emulate) + script (motion grep)
images    explicit dimensions, alt present                              script (images)
contrast  body ≥ 4.5:1, UI ≥ 3:1                                        script (contrast)
```

## Output shape

Decision first, then only the reasoning that earns its place. Tokens as a compact block, each with its source trait:

```
bg       <value>   — from <subject trait>
accent   <value>   — from <subject trait>
display  <face> <weight>   — from <subject trait>
body     <face> <weight>   — from <subject trait>
```

Layouts as an ASCII wireframe, not paragraphs. Critique: one line per issue, most severe first.

## What this mode is not

Not a reason to skip the plan — terse output, not terse thinking. Not hand-waving: "improve the spacing" is short and useless; `24px → 40px between sections` is short and buildable. A request to explore alternatives also opens a full answer for that turn.

