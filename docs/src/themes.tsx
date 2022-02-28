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

export const theme = {
  colors: {
    accent: "green",
  },
  media,
  breakpoints,
};

const theming = createTheming(theme);

export const ThemeProvider = ({
  children,
}: React.PropsWithChildren<{}>): JSX.Element => (
  <theming.ThemeProvider theme={theme}>{children}</theming.ThemeProvider>
);

interface ThemeSelect {
  (tm: typeof theme): string;
}

export const tm = (cb: ThemeSelect) => () =>
  ((fn) => fn(theming.useTheme()))(cb);
