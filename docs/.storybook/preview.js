import React from "react";
import { withThemes } from "@react-theming/storybook-addon";
import * as NextImage from "next/image";

import "../src/styles/globals.css";

import { ThemeProvider, appTheme } from "../src/themes";

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

const themingDecorator = withThemes(ThemeProvider, [appTheme]);
export const decorators = [themingDecorator];
