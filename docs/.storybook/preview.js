import React from "react";
import { ThemeProvider, appTheme } from "../src/themes";
import { withThemes } from '@react-theming/storybook-addon';

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
}

const themingDecorator = withThemes(ThemeProvider, [appTheme]);
export const decorators = [themingDecorator];
