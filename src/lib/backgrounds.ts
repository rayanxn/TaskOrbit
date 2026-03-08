export interface BoardBackgroundDefinition {
  label: string;
  cssBackground: string;
}

export const BOARD_BACKGROUNDS = {
  "midnight-surf": {
    label: "Midnight Surf",
    cssBackground: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 52%, #7dd3fc 100%)",
  },
  "copper-rise": {
    label: "Copper Rise",
    cssBackground: "linear-gradient(135deg, #431407 0%, #c2410c 48%, #fdba74 100%)",
  },
  "moss-light": {
    label: "Moss Light",
    cssBackground: "linear-gradient(135deg, #1f2937 0%, #3f6212 48%, #bef264 100%)",
  },
  "berry-ink": {
    label: "Berry Ink",
    cssBackground: "linear-gradient(135deg, #3b0764 0%, #be185d 52%, #f9a8d4 100%)",
  },
  "stone-canvas": {
    label: "Stone Canvas",
    cssBackground: "linear-gradient(135deg, #111827 0%, #475569 58%, #e2e8f0 100%)",
  },
  "sea-glass": {
    label: "Sea Glass",
    cssBackground: "linear-gradient(135deg, #0f766e 0%, #14b8a6 55%, #ccfbf1 100%)",
  },
  "sunrise-paper": {
    label: "Sunrise Paper",
    cssBackground: "linear-gradient(135deg, #7c2d12 0%, #fb7185 48%, #fde68a 100%)",
  },
  "graphite-bloom": {
    label: "Graphite Bloom",
    cssBackground: "linear-gradient(135deg, #020617 0%, #334155 52%, #a78bfa 100%)",
  },
} as const satisfies Record<string, BoardBackgroundDefinition>;

export type BoardBackgroundKey = keyof typeof BOARD_BACKGROUNDS;

export const DEFAULT_BOARD_BACKGROUND: BoardBackgroundKey = "midnight-surf";

export const BOARD_BACKGROUND_OPTIONS = Object.entries(BOARD_BACKGROUNDS).map(
  ([value, definition]) => ({
    value: value as BoardBackgroundKey,
    ...definition,
  })
);

export function isBoardBackground(value: string): value is BoardBackgroundKey {
  return value in BOARD_BACKGROUNDS;
}

export function resolveBoardBackground(value?: string): BoardBackgroundKey {
  if (value && isBoardBackground(value)) {
    return value;
  }

  return DEFAULT_BOARD_BACKGROUND;
}

export function getBoardBackground(value?: string) {
  return BOARD_BACKGROUNDS[resolveBoardBackground(value)];
}
