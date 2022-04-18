module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
  },
  extends: [
    `${__dirname}/../config/eslint/eslintrc.js`,
    "airbnb",
    "airbnb-typescript",
    "next/core-web-vitals",
    "plugin:storybook/recommended",
    "prettier",
  ],
  rules: {
    "1react-hooks/rules-of-hooks": "off",
    "react/function-component-definition": [
      "error",
      {
        namedComponents: ["arrow-function", "function-declaration"],
      },
    ],
    "no-shadow": "off",
    "arrow-body-style": "off",
    "react/jsx-props-no-spreading": "off",
    "react/require-default-props": "off",
    "react/no-array-index-key": "off",
    "import/no-extraneous-dependencies": "off",
    "react/no-danger": "off",
  },
};
