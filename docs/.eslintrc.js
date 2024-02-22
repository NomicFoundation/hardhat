module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
  },
  extends: [
    "airbnb",
    "airbnb-typescript",
    "next/core-web-vitals",
    "plugin:storybook/recommended",
    "prettier",
  ],
  rules: {
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
    "@typescript-eslint/strict-boolean-expressions": "off",
    "react/no-danger": "off",
    "no-console": ["error", { allow: ["warn", "error"] }],
  },
};
