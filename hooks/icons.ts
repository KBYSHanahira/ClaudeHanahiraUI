// A small set of duotone icons, drawn for this plugin: one 24x24 grid, round caps, and a soft
// fill of the icon's own colour under the main shape, so a small icon still reads as solid.
// Pure strings: a surface that cannot draw SVG never sees them.

export type IconName =
  | 'terminal'
  | 'file'
  | 'filePlus'
  | 'pencil'
  | 'search'
  | 'bot'
  | 'globe'
  | 'checklist'
  | 'cube'
  | 'chip'
  | 'clock'
  | 'calendar'
  | 'gauge'
  | 'coin'
  | 'layers'
  | 'stopwatch'
  | 'branch'
  | 'bolt'
  | 'folder'
  | 'check'
  | 'cross'
  | 'ban'
  | 'pause'
  | 'trash'
  | 'sparkle'
  | 'brain'
  | 'hourglass'
  | 'hash'
  | 'timer'
  | 'sparkles'
  | 'tag'

/** The strokes of each icon, in a 24x24 box. */
export const ICONS: Record<IconName, string> = {
  terminal:
    '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M7.5 9.5l3 2.5-3 2.5"/><path d="M12.5 15h4"/>',
  file:
    '<path d="M7 3h7l5 5v11.5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 19.5v-15A1.5 1.5 0 0 1 7 3z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 16.5h4"/>',
  filePlus:
    '<path d="M7 3h7l5 5v11.5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 19.5v-15A1.5 1.5 0 0 1 7 3z"/><path d="M14 3v5h5"/><path d="M12 11.5v6M9 14.5h6"/>',
  pencil:
    '<path d="M4 20l1-4.5L16.2 4.3a2 2 0 0 1 2.8 0l.7.7a2 2 0 0 1 0 2.8L8.5 19z"/><path d="M14 6.5l3.5 3.5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>',
  bot:
    '<rect x="4" y="8" width="16" height="11" rx="3"/><path d="M12 8V5"/><circle cx="12" cy="4" r="1.2"/><circle cx="9" cy="13.5" r="1.2"/><circle cx="15" cy="13.5" r="1.2"/><path d="M2.5 12.5v2M21.5 12.5v2"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.6 2.6 3.8 5.6 3.8 9S14.6 18.4 12 21c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z"/>',
  checklist:
    '<path d="M10 6h10M10 12h10M10 18h10"/><path d="M3.5 6.2l1.4 1.4L7 5M3.5 12.2l1.4 1.4L7 11M3.5 18.2l1.4 1.4L7 17"/>',
  cube:
    '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
  chip:
    '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.8" y="9.8" width="4.4" height="4.4" rx="0.8"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  calendar:
    '<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M8.5 3v4M15.5 3v4"/><path d="M8.5 14h.01M12 14h.01M15.5 14h.01M8.5 17h.01M12 17h.01"/>',
  gauge: '<path d="M4.5 17.5a8.5 8.5 0 1 1 15 0"/><path d="M12 15.5l3.6-4.6"/><circle cx="12" cy="15.5" r="1.1"/>',
  coin:
    '<circle cx="12" cy="12" r="9"/><path d="M14.6 9.2c-.4-.9-1.4-1.5-2.6-1.5-1.5 0-2.6.8-2.6 1.9 0 2.7 5.3 1.4 5.3 4.4 0 1.1-1.2 2-2.7 2-1.3 0-2.4-.6-2.8-1.5M12 6v1.7M12 16v2"/>',
  layers:
    '<path d="M12 3.5l9 4.5-9 4.5L3 8z"/><path d="M3 12.5l9 4.5 9-4.5"/><path d="M3 17l9 4.5 9-4.5"/>',
  stopwatch:
    '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5"/><path d="M9.5 3h5"/><path d="M12 3v3"/><path d="M18 6.5l1.5-1.5"/>',
  branch:
    '<circle cx="6" cy="5" r="2.2"/><circle cx="6" cy="19" r="2.2"/><circle cx="18" cy="8" r="2.2"/><path d="M6 7.2v9.6"/><path d="M18 10.2c0 4.6-12 2.4-12 6.6"/>',
  bolt: '<path d="M13.5 3L5.5 13.5h6L10.5 21l8-10.5h-6z"/>',
  folder:
    '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.7l2 2.3h7.3A2.5 2.5 0 0 1 21 9.8v7.7a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  cross: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  ban: '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
  pause: '<circle cx="12" cy="12" r="8.5"/><path d="M10 9v6M14 9v6"/>',
  trash: '<path d="M4.5 7h15"/><path d="M9.5 7V4.5h5V7"/><path d="M6.5 7l.9 12.1A1.5 1.5 0 0 0 8.9 20.5h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7"/><path d="M10 11v5.5M14 11v5.5"/>',
  sparkle: '<path d="M12 3.5c.7 4.4 2.6 6.3 7 7-4.4.7-6.3 2.6-7 7-.7-4.4-2.6-6.3-7-7 4.4-.7 6.3-2.6 7-7z"/><path d="M19 3.5v3M17.5 5h3"/>',
  brain:
    '<path d="M12 5.5a3 3 0 0 0-5.6-1.2A3 3 0 0 0 4 9a3 3 0 0 0 .6 5.6A3.2 3.2 0 0 0 9 19.2 3 3 0 0 0 12 20.5z"/><path d="M12 5.5a3 3 0 0 1 5.6-1.2A3 3 0 0 1 20 9a3 3 0 0 1-.6 5.6 3.2 3.2 0 0 1-4.4 4.6 3 3 0 0 1-3 1.3z"/><path d="M12 5.5v15"/><path d="M8 9.5c1.2 0 2 .8 2 2M16 9.5c-1.2 0-2 .8-2 2"/>',
  hourglass:
    '<path d="M6.5 3.5h11M6.5 20.5h11"/><path d="M8 3.5v2.4c0 1.9 1.4 3.3 4 6.1 2.6-2.8 4-4.2 4-6.1V3.5"/><path d="M8 20.5v-2.4c0-1.9 1.4-3.3 4-6.1 2.6 2.8 4 4.2 4 6.1v2.4"/>',
  hash:
    '<path d="M10 4L8 20M16 4l-2 16M4.5 9h15.5M4 15h15.5"/>',
  timer:
    '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5l3.2-3.2"/><path d="M9.5 2.5h5"/><path d="M12 2.5V6"/>',
  sparkles:
    '<path d="M10 3.5c.6 3.9 2.3 5.6 6.2 6.2-3.9.6-5.6 2.3-6.2 6.2-.6-3.9-2.3-5.6-6.2-6.2 3.9-.6 5.6-2.3 6.2-6.2z"/><path d="M18 14c.3 1.9 1.1 2.7 3 3-1.9.3-2.7 1.1-3 3-.3-1.9-1.1-2.7-3-3 1.9-.3 2.7-1.1 3-3z"/>',
  tag:
    '<path d="M3.5 12.6V5A1.5 1.5 0 0 1 5 3.5h7.6a1.5 1.5 0 0 1 1.06.44l6.9 6.9a1.5 1.5 0 0 1 0 2.12l-7.6 7.6a1.5 1.5 0 0 1-2.12 0l-6.9-6.9a1.5 1.5 0 0 1-.44-1.06z"/><circle cx="8.3" cy="8.3" r="1.5"/>',
}

/**
 * The body of each icon that gets the soft fill, in the same 24x24 box. An icon left out
 * (a check, a list) is all line and stays that way.
 */
export const ICON_FILL: Partial<Record<IconName, string>> = {
  terminal: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/>',
  file: '<path d="M7 3h7l5 5v11.5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 19.5v-15A1.5 1.5 0 0 1 7 3z"/>',
  filePlus: '<path d="M7 3h7l5 5v11.5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 19.5v-15A1.5 1.5 0 0 1 7 3z"/>',
  pencil: '<path d="M4 20l1-4.5L16.2 4.3a2 2 0 0 1 2.8 0l.7.7a2 2 0 0 1 0 2.8L8.5 19z"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/>',
  bot: '<rect x="4" y="8" width="16" height="11" rx="3"/>',
  globe: '<circle cx="12" cy="12" r="9"/>',
  cube: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/>',
  chip: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  clock: '<circle cx="12" cy="12" r="9"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2.5"/>',
  gauge: '<path d="M4.5 17.5a8.5 8.5 0 1 1 15 0z"/>',
  coin: '<circle cx="12" cy="12" r="9"/>',
  layers: '<path d="M12 3.5l9 4.5-9 4.5L3 8z"/>',
  stopwatch: '<circle cx="12" cy="13.5" r="7.5"/>',
  bolt: '<path d="M13.5 3L5.5 13.5h6L10.5 21l8-10.5h-6z"/>',
  folder: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.7l2 2.3h7.3A2.5 2.5 0 0 1 21 9.8v7.7a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/>',
  trash: '<path d="M6.5 7l.9 12.1A1.5 1.5 0 0 0 8.9 20.5h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7z"/>',
  sparkle: '<path d="M12 3.5c.7 4.4 2.6 6.3 7 7-4.4.7-6.3 2.6-7 7-.7-4.4-2.6-6.3-7-7 4.4-.7 6.3-2.6 7-7z"/>',
  ban: '<circle cx="12" cy="12" r="8.5"/>',
  brain:
    '<path d="M12 5.5a3 3 0 0 0-5.6-1.2A3 3 0 0 0 4 9a3 3 0 0 0 .6 5.6A3.2 3.2 0 0 0 9 19.2 3 3 0 0 0 12 20.5z"/><path d="M12 5.5a3 3 0 0 1 5.6-1.2A3 3 0 0 1 20 9a3 3 0 0 1-.6 5.6 3.2 3.2 0 0 1-4.4 4.6 3 3 0 0 1-3 1.3z"/>',
  hourglass:
    '<path d="M8.6 20.5c.3-1.6 1.5-2.7 3.4-4.5 1.9 1.8 3.1 2.9 3.4 4.5z"/>',
  timer:
    '<circle cx="12" cy="13.5" r="7.5"/>',
  sparkles:
    '<path d="M10 3.5c.6 3.9 2.3 5.6 6.2 6.2-3.9.6-5.6 2.3-6.2 6.2-.6-3.9-2.3-5.6-6.2-6.2 3.9-.6 5.6-2.3 6.2-6.2z"/><path d="M18 14c.3 1.9 1.1 2.7 3 3-1.9.3-2.7 1.1-3 3-.3-1.9-1.1-2.7-3-3 1.9-.3 2.7-1.1 3-3z"/>',
  tag:
    '<path d="M3.5 12.6V5A1.5 1.5 0 0 1 5 3.5h7.6a1.5 1.5 0 0 1 1.06.44l6.9 6.9a1.5 1.5 0 0 1 0 2.12l-7.6 7.6a1.5 1.5 0 0 1-2.12 0l-6.9-6.9a1.5 1.5 0 0 1-.44-1.06z"/>',
}

/** How strong the soft fill is under the line: enough to read as solid, light enough to keep the line. */
export const ICON_FILL_OPACITY = 0.3

export const hasIcon = (name: string): name is IconName => Object.prototype.hasOwnProperty.call(ICONS, name)

/**
 * An icon as a `<g>` to drop inside another SVG: its top-left corner at (x, y), `size` px square.
 * The stroke is set in icon units, so a small icon keeps a sturdy line. `fill` is the strength
 * of the soft fill under the line (0 for line only).
 */
export const iconGroup = (
  name: IconName,
  color: string,
  x: number,
  y: number,
  size: number,
  width = 2,
  fill = ICON_FILL_OPACITY,
) => {
  const body = ICON_FILL[name]
  const under = body && fill > 0 ? `<g fill="${color}" fill-opacity="${fill}" stroke="none">${body}</g>` : ''
  return `<g transform="translate(${+x.toFixed(2)} ${+y.toFixed(2)}) scale(${+(size / 24).toFixed(4)})" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${under}${ICONS[name]}</g>`
}

/** An icon as a standalone SVG. */
export const iconSvg = (name: IconName, color: string, size = 16, width = 2, fill = ICON_FILL_OPACITY) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${iconGroup(name, color, 0, 0, size, width, fill)}</svg>`
