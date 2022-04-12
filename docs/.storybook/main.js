const nextConfig = require("../next.config.js");

module.exports = {
  stories: ["../src/components/**/*.stories.tsx"],
  addons: [
    "@react-theming/storybook-addon",
    // "@storybook/addon-links",
    // "@storybook/addon-essentials",
    // "@storybook/addon-interactions",
  ],
  staticDirs: ["../public"],
  framework: "@storybook/react",
  webpackFinal: async (baseConfig) => {
    return nextConfig.linariaConfig.webpack(baseConfig, {});
  },
  typescript: {
    check: false,
    checkOptions: {},
    reactDocgen: "react-docgen-typescript",
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) =>
        prop.parent ? !/node_modules/.test(prop.parent.fileName) : true,
    },
  },
};
