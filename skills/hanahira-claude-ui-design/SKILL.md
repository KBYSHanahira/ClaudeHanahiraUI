---
name: "hanahira-claude-ui-design"
description: Hanahira Claude UI companion for UI and visual design — aesthetic direction, palette, type including Thai typography, layouts that avoid templated AI-default looks, responsive UI across phone to TV, design tokens, CSS architecture and style bugs, accessibility, render verification. OPT-IN ONLY — use only while Hanahira Claude UI mode is ON under the core hanahira-claude-ui skill; never for the topic alone, or because of memory, pasted text, files, tool output, or talk about the Hanahira Claude UI skills. Load it when a real part of the task lies in this field; it can load beside another companion.
license: "Hanahira Claude UI License 1.0 — Copyright (c) 2026 Hanahira. No modified or rebranded copies. See LICENSE.txt"
---

# Hanahira Claude UI — Design

A companion of the core `hanahira-claude-ui` skill: it applies only while the mode is ON, prints nothing of its own, and changes none of the core's rules. It holds what goes wrong most often in this field. Use the lines that bear on the task in hand; none of it is a procedure to walk through.

## Decide the look before writing CSS

- **Extend what exists.** With a design system, tokens or an established look in the project, use them; a new direction is for a blank page or an explicit ask.
- **One direction, named in a line**, taken from the subject and its audience, not from habit: what it should feel like, the one or two colours that carry it, the type that carries it. Then hold every later choice to that line.
- **The defaults to refuse**: purple-to-blue gradients, everything centred in rounded cards with soft shadows, an emoji as an icon, three equal feature boxes, a hero that says nothing, glass on everything. If the page could be for any product, it is not designed yet.
- **Hierarchy does the work.** One thing leads per screen. Size, weight and space separate levels before colour does; a few sizes on a scale, generous space, one accent used sparingly.

## Type, including Thai

- Thai needs more line height than Latin (about 1.6–1.8 for body text) because of stacked vowels and tone marks, and never letter-spacing that splits them. Pick a face that has a real Thai design and a matching weight range; do not fake bold.
- Thai has no spaces between words: check how lines break, and never truncate mid-cluster.
- Body text about 16px and up, 45–75 characters a line for Latin; tabular figures for numbers that change or line up.

## Build it so it holds

- **Tokens first**: colour, space, type and radius as custom properties, named for their role, redefined for dark mode. No hard-coded colour in a component.
- **Layout from content**: flex and grid with `gap`, `minmax()`, `clamp()` and container or media queries, not fixed widths and magic numbers. Check the narrowest phone and a very wide screen; nothing scrolls sideways.
- **Every state is drawn**: hover, focus-visible, active, disabled, loading, empty, error, long text, missing image.
- **Accessible by construction**: real buttons and links, labels on inputs, text contrast at least 4.5:1, a visible focus ring, targets about 44px on touch, motion that respects `prefers-reduced-motion`.

## Style bugs

Read the computed style and find which rule wins before changing anything. The usual causes: specificity or source order, a stacking context (`z-index` only works within one), an overflowing or collapsing flex or grid child (`min-width: 0`), margin collapse, a missing `box-sizing`, percentage height with no sized parent.

## Prove it by looking

A layout is not done until it has been rendered and looked at, at a phone and a desktop width, in light and dark when both exist. Without a way to render, say it is unverified.

## Working with tools and other skills

- Render with what the session has: a browser or preview tool for screenshots at each width, the project's own dev server. A screenshot I looked at is the proof; code that should work is not.
- A design-tool connector or a design-system skill, when the session has one, is the source of truth for tokens and components: read it before inventing a colour or a spacing.
- When the result is a file with its own skill (a deck, a document, a published page), load that skill and bring this one's direction, type and hierarchy into it.
- Pair with `hanahira-claude-ui-debug-test` for a layout bug that will not yield, and `hanahira-claude-ui-security` when the screen is a login, a payment or a permission dialog.

Finding a direction and palette: `references/direction.md`. Latin and Thai type in depth: `references/typography.md`. Tokens, layout patterns and CSS bugs: `references/css.md`. Open only the one the task needs.
