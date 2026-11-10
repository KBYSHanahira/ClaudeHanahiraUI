# Finding a direction

A look-up for when a product needs a look of its own and there is no design system to follow. The generic look is not caused by lack of skill; it is what happens when each decision is made alone, by reaching for the safest option. A direction is a small set of decisions made together, from the subject.

## Start from the subject, not from a style

Ask what this product is *about* and who it is for, then look for visual material in that world. A tool for accountants, a bakery's ordering page and a game's community site should not share a font, a palette or a layout rhythm.

Useful prompts:

- If this product were a physical place or object, what would it be made of? Paper, steel, cloth, glass, wood?
- What does the audience already trust and use? Their existing tools set the expectation to meet or to break on purpose.
- What is the one feeling a first-time visitor should have after five seconds?
- What should it definitely *not* feel like?
- Is there an existing thing — a logo, a product photo, a mascot, a place — whose colours and shapes can be extended rather than invented?

## Pick a position on a few axes

A direction is easier to hold when stated as choices. Pick one side of each, and lean into it; the middle of every axis is where generic lives.

```
Dense        ↔  Spacious
Sharp        ↔  Soft
Quiet        ↔  Loud
Warm         ↔  Cool
Flat         ↔  Layered
Serious      ↔  Playful
Classical    ↔  Contemporary
```

A data tool might be dense, sharp, quiet, cool, flat. A children's app might be spacious, soft, loud, warm, layered. Both are right for themselves.

## One distinctive move

Choose one element to make unusual and keep the rest disciplined. Candidates: an unexpected display typeface; a single strong colour used in large fields; a grid that breaks at one deliberate point; illustration or a mascot with real character; oversized numerals; a distinctive shape language (all square, all pill, one cut corner); a texture or a pattern drawn from the subject.

Two distinctive moves compete. Five is noise.

## Palette

1. **Start with the neutrals.** Most of any interface is background, surface, text and border. Tint them slightly toward the brand's temperature instead of pure grey; pure black on pure white is harsher than it needs to be.
2. **Choose one accent** with a reason — from the logo, the subject, the feeling. Decide where it is allowed: usually the primary action, links, and one moment of emphasis.
3. **Build each colour as a ramp** of steps from light to dark, so that hover, pressed, subtle-background and border states have a home. Working in a perceptual space (OKLCH) keeps steps even and makes it easy to hold lightness while changing hue.
4. **Add state colours** (success, warning, danger, info) adjusted to sit with the palette, not the raw defaults.
5. **Check every text and background pair for contrast** with a tool — 4.5:1 for text, 3:1 for large text and control edges — in both themes.
6. **Dark theme is designed, not inverted**: surfaces are dark greys rather than black, elevation is shown by lighter surfaces instead of shadows, and saturated colours are toned down so they do not glow.

Proportions matter more than the hues: roughly, a great deal of neutral, a moderate amount of a secondary tone, and a small amount of accent.

## Type as character

The typeface carries more personality than any other choice. Choose the display face for the feeling and the text face for reading; they may be the same family. Check that the family has the weights needed and covers every script the product uses — a beautiful Latin face that falls back to a mismatched system font for Thai is a broken design. Details: `typography.md`.

## Shape, depth and density

Decide once and apply everywhere:

- **Radius**: none, small, large or fully round — and a rule for nesting (inner radius = outer radius minus the padding).
- **Depth**: flat with borders, or shadows, or tinted layers. Mixing all three reads as indecision. Shadows, if used, come from one light source and are soft and few.
- **Borders**: hairline and low-contrast; or none, with space doing the work.
- **Density**: how much fits on a screen. Tools used all day want more; pages read once want less.
- **Imagery**: photography, illustration, icons — one style of each. Icons from a single set at a single stroke weight, never emoji standing in for icons.

## Writing it down

A direction that is not written down drifts. Record it in a few lines and as tokens:

```
Feeling    calm · precise · warm
Type       <Display face> for headings, <Text face> for body; Thai: <face>
Colour     warm off-white base, ink text, one terracotta accent for actions only
Shape      4px radius, hairline borders, no shadows
One thing  oversized tabular numerals on every figure that matters
```

Then show it: one real screen with real content, at phone and desktop width, before building the rest. It is far cheaper to change direction on one screen than on twenty.

## Testing the direction

- Cover the logo: could this be any other product? If yes, it is not specific yet.
- Remove the one distinctive move: does it collapse into the default mould? Then the rest was not doing enough.
- Does it still work in grey, with no colour at all? If not, hierarchy is leaning on colour.
- Does it hold with real, awkward content — long names, empty states, a table with forty rows?
- Can every decision answer "why this, for this product?"
