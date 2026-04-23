import { colorize } from "@nomicfoundation/hardhat-utils/style";

export interface Colorizer {
  blue: (text: string) => string;
  green: (text: string) => string;
  red: (text: string) => string;
  cyan: (text: string) => string;
  yellow: (text: string) => string;
  gray: (text: string) => string;
  dim: (text: string) => string;
}

export const DEFAULT_COLORIZER: Colorizer = {
  blue: colorize("blue"),
  green: colorize("green"),
  red: colorize("red"),
  cyan: colorize("cyan"),
  yellow: colorize("yellow"),
  gray: colorize("gray"),
  dim: colorize("dim"),
};
