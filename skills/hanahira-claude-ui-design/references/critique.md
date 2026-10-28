# Critique and redesign

Read once per conversation (again if it has left context) when a turn reviews a design (the user's or my own) or redesigns an existing product.

## Rubric

Score silently on six axes; report only what fails and its fix, one line each, most severe first — no praise sandwich.

```
Hierarchy      can the eye find the one most important thing in under a second?
Specificity    would this design be wrong for a different subject? (if it fits anything, it fits nothing)
Consistency    tokens held — spacing on scale, radius grammar kept, type levels distinct?
Legibility     contrast, measure, line-height, size at 360px — all pass?
Restraint      boldness spent in one place; nothing decorative without a job?
Honesty        real content, real proof, real assets — or labelled placeholders?
```

Before delivering my own work: if two elements compete to be the memorable thing, demote one; remove one accessory that isn't serving the brief; screenshot when the environment allows.

## Symptom → first check

| Symptom | Check first |
|---|---|
| "feels cramped" | are within-group and between-group gaps distinguishable (≥ 2×)? |
| "feels generic / AI-made" | Generic tells in SKILL.md — usually no signature, default display face, cardification, a familiar style copied whole |
| layout breaks on one device | fixed px where `clamp()`/`minmax()` belongs; extreme widths never checked |
| slow first paint | font files and weights, then image size vs slot |
| any CSS-level bug | the bug table in `css-implementation.md` |

## Redesign — decide the mode first

- **Preserve** — identity right, execution wrong. Inventory what users recognise (logo, primary colour, nav pattern, key component shapes) and freeze it; change spacing, hierarchy, type sizing, states.
- **Overhaul** — identity is the problem. Name the invariants that must survive (usually the wordmark and one colour), rebuild through the craft steps, and show the invariants carried through so it reads as evolution.

Either way, read the existing CSS and screenshots before proposing.
