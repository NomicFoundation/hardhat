import type { Colorizer } from "../../../src/internal/utils/colorizer.js";

export const noopColorizer: Colorizer = {
  bold: (text: string) => text,
  blue: (text: string) => text,
  green: (text: string) => text,
  red: (text: string) => text,
  yellow: (text: string) => text,
  cyan: (text: string) => text,
  grey: (text: string) => text,
  dim: (text: string) => text,
};

export const tagColorizer: Colorizer = {
  bold: (text: string) => `<bold>${text}</bold>`,
  blue: (text: string) => `<blue>${text}</blue>`,
  green: (text: string) => `<green>${text}</green>`,
  red: (text: string) => `<red>${text}</red>`,
  yellow: (text: string) => `<yellow>${text}</yellow>`,
  cyan: (text: string) => `<cyan>${text}</cyan>`,
  grey: (text: string) => `<grey>${text}</grey>`,
  dim: (text: string) => `<dim>${text}</dim>`,
};
