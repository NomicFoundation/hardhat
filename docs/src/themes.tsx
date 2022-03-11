import React from "react";
import { createTheming } from "@callstack/react-theme-provider";

export { styled } from "linaria/react";

const breakpoints = {
  sm: 576,
  md: 768,
  lg: 1140,
};

const media = {
  sm: `@media screen and (min-width: ${breakpoints.sm}px)`,
  md: `@media screen and (min-width: ${breakpoints.md}px)`,
  lg: `@media screen and (min-width: ${breakpoints.lg}px)`,
};

export const appTheme = {
  colors: {
    primary: "#FFF100",
    accent: "green",
  },
  media,
  breakpoints,
};

const theming = createTheming(appTheme);

export const ThemeProvider = ({
  children,
  theme: themeProp,
}: React.PropsWithChildren<{ theme: {} }>): JSX.Element => (
  <theming.ThemeProvider theme={themeProp}>{children}</theming.ThemeProvider>
);

interface ThemeSelect {
  (tm: typeof appTheme): string;
}

export const tm = (cb: ThemeSelect) => () =>
  ((fn) => fn(theming.useTheme()))(cb);
