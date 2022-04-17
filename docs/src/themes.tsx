import React from "react";
import { createTheming } from "@callstack/react-theme-provider";

export { styled } from "linaria/react";

const breakpoints = {
  xs: 360,
  sm: 412,
  md: 1020,
  lg: 1440,
};

const media = {
  xs: `@media screen and (min-width: ${breakpoints.xs}px)`,
  sm: `@media screen and (min-width: ${breakpoints.sm}px)`,
  md: `@media screen and (min-width: ${breakpoints.md}px)`,
  lg: `@media screen and (min-width: ${breakpoints.lg}px)`,
};

export const lightPalette = {
  transparent: "transparent",
  neutral0: "#FFFFFF",
  neutral100: "#F2F2F2",
  neutral200: "#FCFCF1",
  neutral400: "#C4C4C4",
  neutral500: "#4B4D4D",
  neutral600: "#6E6F70",
  neutral700: "#9B9FA8",
  neutral800: "#16181D",
  neutral900: "#0A0A0A",
  accent100: "#FBFCDB",
  accent600: "#FFF04D",
  accent700: "#CCB200",
  accent800: "#FFF100",
  accent900: "#EDCF00",
  border: "#4B4D4D",
  complementary600: "#E9DEFA",
  cardBoxShadow: "#0A0A0A14",
  sliderButtonShadow: "rgba(0, 0, 0, 0.102)",
  sliderButtonHoverShadow: "hsl(0deg 0% 83% / 50%)",
  toolsBlockBorder: "#d4d4d4",
  mottoRunnerBackground: "#F8F4CB",
  mottoNetworkBackground: "#f6edd1",
  mottoIgnitionBackground: "#f3ecf3",
  mottoVscodeBackground: "#f0e7fb",
  getStartedTopBackground:
    "linear-gradient(180deg, #ffffff 3.12%, rgba(255, 255, 255, 0) 67.71%)",
  getStartedBottomBackground:
    "linear-gradient(180deg, #ffffff 0%, rgba(255, 255, 255, 0) 55.73%)",
  textureBackground:
    "linear-gradient(254.24deg, #E9DEFA 0%, #FBFCDB 100%, #FBFCDB 100%);",
  neutralBackground:
    "linear-gradient(180deg, #FFFFFF 7.96%, rgba(255, 255, 255, 0.484844) 18.71%, rgba(255, 255, 255, 0) 28.83%, rgba(255, 255, 255, 0) 68.82%, #FFFFFF 91.43%);",
};

export const darkPalette = {
  transparent: "transparent",
  neutral0: "#16181D",
  neutral100: "#F2F2F2",
  neutral200: "#16181D",
  neutral400: "#4B4D4D",
  neutral500: "#4B4D4D",
  neutral600: "#6E6F70",
  neutral700: "#9B9FA8",
  neutral800: "#B0B2B5",
  neutral900: "#FFFFFF",
  accent100: "#FBFCDB",
  accent600: "#FFF04D",
  accent700: "#CCB200",
  accent800: "#FFF100",
  accent900: "#EDCF00",
  border: "#4B4D4D",
  complementary600: "#E9DEFA",
  cardBoxShadow: "#0A0A0A14",
  sliderButtonShadow: "rgba(0, 0, 0, 0.102)",
  sliderButtonHoverShadow: "hsl(0deg 0% 83% / 50%)",
  toolsBlockBorder: "#d4d4d4",
  mottoRunnerBackground: "#F8F4CB",
  mottoNetworkBackground: "#f6edd1",
  mottoIgnitionBackground: "#f3ecf3",
  mottoVscodeBackground: "#f0e7fb",
  getStartedTopBackground:
    "linear-gradient(180deg, #ffffff 3.12%, rgba(255, 255, 255, 0) 67.71%)",
  getStartedBottomBackground:
    "linear-gradient(180deg, #ffffff 0%, rgba(255, 255, 255, 0) 55.73%)",
  textureBackground:
    "linear-gradient(254.24deg, #E9DEFA 0%, #FBFCDB 100%, #FBFCDB 100%);",
  neutralBackground:
    "linear-gradient(180deg, #FFFFFF 7.96%, rgba(255, 255, 255, 0.484844) 18.71%, rgba(255, 255, 255, 0) 28.83%, rgba(255, 255, 255, 0) 68.82%, #FFFFFF 91.43%);",
};

type Palette = typeof lightPalette;

export const appTheme = {
  light: {
    colors: lightPalette,
  },
  dark: {
    colors: darkPalette,
  },
  media,
  breakpoints,
};

const theming = createTheming(appTheme);

type Theme = typeof appTheme;

export const ThemeProvider = ({
  children,
  theme: themeProp,
}: React.PropsWithChildren<{ theme: Theme }>): JSX.Element => (
  <theming.ThemeProvider theme={themeProp}>{children}</theming.ThemeProvider>
);

type ThemeSelect<T> = (tm: T) => string;

export const tm = (cb: ThemeSelect<{ colors: Palette }>) => () =>
  ((fn) => fn(theming.useTheme().light))(cb);

export const tmDark = (cb: ThemeSelect<{ colors: Palette }>) => () =>
  ((fn) => fn(theming.useTheme().dark))(cb);
