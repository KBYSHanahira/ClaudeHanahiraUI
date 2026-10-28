# Direction — for new design work

Read once per conversation (again if it has left context) when a turn creates a new page, component set, identity or overhaul. Everything here is vocabulary for SKILL.md's craft steps, not a menu: the subject decides, and every token must trace back to a subject trait.

## Positioning questions

Answer each in a few words before choosing anything:

```
Narrative role      tool, story, catalogue, or statement?
Viewing distance    glance (dashboard, TV), read (editorial), study (docs, data)?
Temperature         cold/technical ↔ warm/human — where does the subject sit?
Capacity            one idea per screen, or twenty?
```

## Departing from the default

There is no list of styles to pick from. Before committing, ask what a generator would produce for this brief by habit — the first palette, the first face, the first layout that comes to mind — and treat that as the thing to move away from. Each departure must come from a subject trait (a material, a vernacular form, an era, an audience habit), not from novelty for its own sake. When the subject-derived move and the audience's trust pull apart, the audience wins.

## Choosing type

Choose faces yourself from what each one *says* about the subject; there is no shortlist. For every candidate check:

- **Voice** — the subject trait it expresses (precision, warmth, authority, craft, play). A face chosen because it is familiar is a default.
- **Job** — display, body, or real code/data. A mono face is for real code or data only.
- **Pairing** — one axis of contrast (serif vs sans, or one family at two extreme weights); two similar sans is the commonest weak pairing; match x-heights.
- **Practical** — licence allows the use, available to self-host or from a font service, the weights and scripts needed exist, file size within budget. Name the source with the choice.
- **Overuse** — if it is the face most generated UI would use, it needs a reason from the subject.

Budget: 2–3 weights per script; a variable font counts as one file; a Thai page may add one Thai family.

Scale: one ratio held throughout — about 1.2 for dense UI, 1.25–1.333 for pages with a big hero. Display above 48px takes negative tracking (−0.01 to −0.03em); labels below 13px take positive (+0.02 to +0.06em). Hierarchy comes from size, weight and space — never from colouring or italicising one word.

**Thai type** — decide the structure first: loopless forms read modern and pair with geometric Latin; looped forms read formal and stay legible at small sizes. Then pick a family yourself by the same checks, plus: a matching Latin design or a Latin face with similar weight and x-height, visible weight steps (400 → 600 → 700), and a wide-weight fallback. Thai glyphs look smaller than Latin at the same px — bump Thai body to 17–18px or use a matched-Latin family. Left-align; justified Thai makes rivers.

## Layout systems

- **Grid**: 12 columns for marketing and dashboards, 6 for reading, 4 on mobile. Reading columns 55–75ch.
- **Spatial unit**: 8px (4px for fine UI); every gap is on the scale. `13px` or `27px` is the tell that spacing wasn't decided.
- **Hierarchy through scale**: two levels within 1.15× of each other merge into one.
- **Section rhythm**: vary the *shape* of consecutive sections; three alike in a row reads as a template. Section gap ≥ 2× the gap inside a section; the size itself comes from the subject's density.
- **Structural devices** (eyebrows, numbering, dividers, borders) encode information or go. `01 / 02 / 03` only for a real sequence. Containers only when grouping, selection or elevation means something.
- **Alignment**: left for reading and tools; centred for statements only; mixed only for two clearly different zones. Say which in the plan.
- **Hero** — the most characteristic thing in the subject's world, in the form that suits it, decided fresh for each brief. Leave room on all sides; a hero touching the nav reads as an accident.
- **Radius grammar**: assign by role, at most three values, each with a reason from the subject.
- **Elevation**: one border token, or one or two shadows tinted with the ink's hue at low alpha — never neutral grey.

## Component grammar

- **Buttons**: primary (accent fill), secondary (border or surface), ghost (text). Height 44–48px touch (hit area ≥ 44px); 32–36px dense desktop (target ≥ 24px, WCAG 2.5.8). Label states the outcome. One primary per view.
- **Inputs**: label above, never placeholder-as-label; border ≥ 3:1 against its ground (WCAG 1.4.11); 2px focus ring with offset; error below with the reason and the fix.
- **Tables**: text left, numbers right with `tabular-nums`; zebra only for long tables; sticky header when it scrolls.
- **States**: hover, focus-visible, active, disabled, loading, empty, error — all seven decided for every interactive element. Focus visible without hover.
- **Feedback**: toasts for outcomes, inline messages for form errors, modals only for irreversible decisions. Empty and error states say what to do and offer the action.

## Motion

Motion shows hierarchy, feedback, causality or narrative — nothing else. One orchestrated moment beats scattered effects. Durations: micro 120–200ms, transitions 200–350ms, reveals 400–700ms; ease-out to enter, ease-in-out to move. Property rules are in SKILL.md *Performance*.

## Copy is design

Name things by what users understand, not by internal or technical terms. A CTA says what happens and keeps its name through the flow. Errors say what went wrong and how to fix it. No fabricated proof — metrics, logos, testimonials — ever: a labelled placeholder or a request for the real thing. Sentence case, plain verbs.

## Device classes

| Class | Distance | Input | What changes |
|---|---|---|---|
| Mobile | ~30cm | thumb | single column, targets ≥ 44px, key actions reachable at the bottom |
| Tablet | ~40cm | finger | 2 columns max, targets ≥ 44px, both orientations |
| Desktop | ~60cm | cursor + keyboard | multi-column, real hover, targets ≥ 24px |
| TV / console | ~3m | D-pad / remote | body ≥ 24px at 1080p, ~5% safe-area inset, spatial focus order, no hover |

Fluid by default: `clamp()` for type and space, `minmax()` grids, container queries where a component adapts to its slot. Breakpoints go where the design breaks, not at device names. Size for touch, enhance for pointer.
