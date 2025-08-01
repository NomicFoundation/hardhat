export interface Colorizer {
  bold: (text: string) => string;
  blue: (text: string) => string;
  green: (text: string) => string;
  red: (text: string) => string;
  cyan: (text: string) => string;
  yellow: (text: string) => string;
  grey: (text: string) => string;
  dim: (text: string) => string;
}
