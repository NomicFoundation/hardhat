import React from "react";
import { withThemes } from "@react-theming/storybook-addon";
import * as NextImage from "next/image";

import "../src/styles/globals.css";

import {
  ThemeProvider,
  media,
  tmSelectors,
  breakpoints,
  lightPalette,
  darkPalette,
  hcDarkPalette,
  ThemeContext,
  theming,
  ThemesEnum,
} from "../src/themes";

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};

const OriginalNextImage = NextImage.default;

Object.defineProperty(NextImage, "default", {
  configurable: true,
  value: (props) => <OriginalNextImage {...props} unoptimized />,
});

const providerFn = ({ theme, children }) => {
  const appTheme = {
    light: {
      colors: theme,
    },
    dark: {
      colors: darkPalette,
    },
    hcDark: {
      colors: hcDarkPalette,
    },
    media,
    breakpoints,
    tmSelectors,
  };

  const themesTypesMap = {
    Light: ThemesEnum.LIGHT,
    Dark: ThemesEnum.DARK,
    "Dark HC": ThemesEnum.HC_DARK,
  };

  return (
    <ThemeContext.Provider
      value={{ theme: themesTypesMap[theme.name], changeTheme: () => null }}
    >
      <theming.ThemeProvider theme={appTheme}>{children}</theming.ThemeProvider>
    </ThemeContext.Provider>
  );
};

export const onThemeSwitch = (context) => {
  const { theme } = context;
  const background = theme.neutral0 || null;
  const parameters = {
    backgrounds: {
      default: background,
    },
  };
  return {
    parameters,
  };
};

const themingDecorator = withThemes(
  null,
  [lightPalette, darkPalette, hcDarkPalette],
  { providerFn, onThemeSwitch }
);
export const decorators = [themingDecorator];
