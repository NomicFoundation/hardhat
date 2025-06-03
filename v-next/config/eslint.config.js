// @ts-check

import path from "node:path";
import { builtinModules } from "node:module";
import assert from "node:assert";

import globals from "globals";
import tseslint from "typescript-eslint";
import * as importPlugin from "eslint-plugin-import";
import noOnlyTestsPlugin from "eslint-plugin-no-only-tests";
import eslintCommentsPlugin from "@eslint-community/eslint-plugin-eslint-comments";

/**
 * Creates a predefined config that every package inside this monorepo should use.
 *
 * Note that the config includes both the sources of the package (inside `src/`) and
 * the tests (inside `test/`), so a single config file per package is enough.
 *
 * The only packages that should not use this config are our own eslint plugins/rules.
 *
 * Note regarding types:
 * https://github.com/typescript-eslint/typescript-eslint/issues/9110#issuecomment-2118469163
 *
 * @param {string} configFilePath The path to the config file that is using this function.
 * @param {{ onlyHardhatError?: boolean, enforceHardhatTestUtils?: boolean }} options An object with options to enable/disable certain rules.
 * @returns {import("typescript-eslint").ConfigArray}
 */
export function createConfig(
  configFilePath,
  options = { onlyHardhatError: true, enforceHardhatTestUtils: true },
) {
  /**
   * @type {import("eslint").Linter.RuleEntry}
   */
  const noRestrictedSyntaxRules = [
    "error",
    // This forces us to use native #private fields
    {
      selector:
        ':matches(PropertyDefinition, MethodDefinition[kind!="constructor"], TSParameterProperty)[accessibility="private"]',
      message: "Use #private instead",
    },
    // We forbid `instanceof HardhatError` because it may not work well if the users has multiple versions of `@nomicfoundation/hardhat-errors` installed.
    {
      selector:
        ":matches(BinaryExpression[operator='instanceof']) > Identifier[name='HardhatError']",
      message: "Use HardhatError.isHardhatError instead of instanceof",
    },
    // We forbid casting errors in favor of using ensureError or HardhatError.isHardhatError
    {
      selector: "CatchClause[param] > Identifier[typeAnnotation]",
      message:
        "Use ensureError() or HardhatError.isHardhatError instead of casting the error",
    },
    {
      selector:
        "CallExpression[callee.object.name='assert'][callee.property.name=/strict/i]",
      message:
        "Use non-strict methods when importing from 'node:assert/strict'",
    },
    // We forbid using assert.ok and assert directly without a message
    // as this may cause a bug. See: https://github.com/nodejs/node/issues/52962
    {
      selector: "CallExpression[callee.name='assert'][arguments.length<2]",
      message: "assert should provide an error message as the second argument",
    },
    {
      selector:
        "CallExpression[callee.object.name='assert'][callee.property.name='ok'][arguments.length<2]",
      message:
        "assert.ok should provide an error message as the second argument",
    },
    {
      selector: "AwaitExpression:not(:function AwaitExpression)",
      message:
        "Top-level await is only allowed in a few cases. Please discuss this change with the team.",
    },
    {
      selector:
        "CallExpression[callee.object.name='assert'][callee.property.name=doesNotThrow]",
      message:
        "Don't use assert.doesNotThrow. Just call the function directly, letting the error bubble up if thrown",
    },
    {
      selector:
        "CallExpression[callee.object.name='assert'][callee.property.name=doesNotReject]",
      message:
        "Don't use assert.doesNotReject. Just await the async-function-call/promise directly, letting the error bubble up if rejected",
    },
    {
      selector:
        "CallExpression[callee.object.name='z'][callee.property.name=union]",
      message:
        "Use the conditionalUnionType or unionType helpers from the zod utils package instead, as it provides better error messages.",
    },
    ...(options.enforceHardhatTestUtils
      ? [
          {
            selector:
              "CallExpression[callee.object.name='assert'][callee.property.name=throws]",
            message: "Don't use assert.throws. Use our test helpers instead.",
          },
          {
            selector:
              "CallExpression[callee.object.name='assert'][callee.property.name=rejects]",
            message: "Don't use assert.rejects. Use our test helpers instead.",
          },
        ]
      : []),
  ];

  /**
   * @type {import("eslint").Linter.RulesRecord}
   */
  const rules = {
    "@eslint-community/eslint-comments/require-description": [
      "error",
      { ignore: ["eslint-enable"] },
    ],
    "@typescript-eslint/adjacent-overload-signatures": "error",
    "@typescript-eslint/array-type": [
      "error",
      {
        default: "array-simple",
      },
    ],
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/no-wrapper-object-types": "error",
    "@typescript-eslint/ban-ts-comment": [
      "error",
      {
        "ts-expect-error": "allow-with-description",
        "ts-ignore": true,
        "ts-nocheck": true,
        "ts-check": false,
        minimumDescriptionLength: 3,
      },
    ],
    "@typescript-eslint/consistent-type-assertions": [
      "error",
      { assertionStyle: "never" },
    ],
    "@typescript-eslint/consistent-type-definitions": "error",
    "@typescript-eslint/consistent-type-imports": [
      "error",
      {
        prefer: "type-imports",
        disallowTypeAnnotations: true,
      },
    ],
    "@typescript-eslint/dot-notation": "error",
    "@typescript-eslint/explicit-member-accessibility": [
      "error",
      {
        accessibility: "explicit",
        overrides: {
          constructors: "no-public",
        },
      },
    ],
    "@typescript-eslint/naming-convention": [
      "error",
      {
        selector: "default",
        format: ["camelCase"],
        leadingUnderscore: "allow",
        trailingUnderscore: "allow",
      },
      {
        selector: ["import"],
        format: ["camelCase", "PascalCase"],
      },
      {
        selector: ["variable", "parameter"],
        format: ["camelCase", "UPPER_CASE", "PascalCase"],
        leadingUnderscore: "allow",
        trailingUnderscore: "allow",
      },
      {
        selector: ["classProperty"],
        format: ["camelCase", "UPPER_CASE"],
        leadingUnderscore: "allow",
      },
      {
        selector: ["classProperty"],
        modifiers: ["private"],
        format: ["camelCase", "UPPER_CASE"],
        leadingUnderscore: "allow",
      },
      {
        selector: "enumMember",
        format: ["UPPER_CASE"],
      },
      {
        selector: "memberLike",
        modifiers: ["private"],
        format: ["camelCase"],
        leadingUnderscore: "allow",
      },
      {
        selector: ["objectLiteralProperty"],
        format: null,
      },
      {
        selector: ["objectLiteralMethod"],
        format: ["camelCase", "PascalCase", "snake_case", "UPPER_CASE"],
        leadingUnderscore: "allow",
      },
      {
        selector: "typeProperty",
        format: ["camelCase", "PascalCase"],
        leadingUnderscore: "allow",
      },
      {
        selector: "typeLike",
        format: ["PascalCase"],
      },
    ],
    "@typescript-eslint/no-empty-interface": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-new": "error",
    "@typescript-eslint/no-namespace": "error",
    "@typescript-eslint/no-non-null-assertion": "error",
    "@typescript-eslint/no-redeclare": "error",
    "@typescript-eslint/no-shadow": [
      "error",
      {
        hoist: "all",
      },
    ],
    "@typescript-eslint/no-this-alias": "error",
    "@typescript-eslint/no-unused-expressions": "error",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/prefer-for-of": "error",
    "@typescript-eslint/prefer-function-type": "error",
    "@typescript-eslint/prefer-namespace-keyword": "error",
    "@typescript-eslint/prefer-readonly": "error",
    // "@typescript-eslint/prefer-readonly-parameter-types": "error", // TBD if we enable it

    "no-restricted-syntax": [...noRestrictedSyntaxRules],
    "@typescript-eslint/restrict-plus-operands": "error",
    "@typescript-eslint/restrict-template-expressions": [
      "error",
      {
        allowAny: true,
      },
    ],
    "@typescript-eslint/strict-boolean-expressions": [
      "error",
      {
        allowString: false,
        allowNumber: false,
        allowNullableObject: false,
        allowAny: false,
      },
    ],
    "@typescript-eslint/switch-exhaustiveness-check": [
      "error",
      {
        allowDefaultCaseForExhaustiveSwitch: false,
        requireDefaultForNonUnion: true,
      },
    ],
    "@typescript-eslint/triple-slash-reference": [
      "error",
      {
        path: "always",
        types: "prefer-import",
        lib: "always",
      },
    ],
    "@typescript-eslint/unified-signatures": "error",
    "@typescript-eslint/use-unknown-in-catch-callback-variable": "error",
    "constructor-super": "error",
    eqeqeq: ["error", "always"],
    "guard-for-in": "error",
    "id-blacklist": "error",
    "id-match": "error",
    "import/no-extraneous-dependencies": [
      "error",
      {
        devDependencies: false,
      },
    ],
    "import/order": [
      "error",
      {
        groups: [
          "type",
          "builtin",
          "external",
          "parent",
          "sibling",
          "index",
          "object",
        ],
        "newlines-between": "always",
        alphabetize: {
          order: "asc",
        },
      },
    ],
    "import/no-duplicates": "error",
    "import/no-relative-packages": "error",
    "no-bitwise": "error",
    "no-caller": "error",
    "no-cond-assign": "error",
    "no-debugger": "error",
    "no-duplicate-case": "error",
    "no-eval": "error",
    "no-extra-bind": "error",
    "no-new-func": "error",
    "no-new-wrappers": "error",
    "no-only-tests/no-only-tests": "error",
    "no-return-await": "off",
    "@typescript-eslint/return-await": "error",
    "no-sequences": "error",
    "no-sparse-arrays": "error",
    "no-template-curly-in-string": "error",
    "no-throw-literal": "error",
    "no-undef-init": "error",
    "no-unsafe-finally": "error",
    "no-unused-labels": "error",
    "no-unused-vars": "off",
    "no-var": "error",
    "object-shorthand": "error",
    "one-var": ["error", "never"],
    "prefer-const": "error",
    "prefer-object-spread": "error",
    radix: "error",
    "spaced-comment": [
      "error",
      "always",
      {
        markers: ["/"],
      },
    ],
    "use-isnan": "error",
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["/hardhat/src", "/@nomicfoundation/*/src"],
            message:
              "Don't import from the src folder, use the package entry point instead.",
          },
          {
            group: builtinModules.map((m) => `/${m}`),
            message:
              "Use the 'node:' prefix to import built-in Node.js modules.",
          },
        ],
        paths: [
          {
            // Due to an error in @types/node 20 you can't import AssertionError from node:assert/strict
            name: "node:assert/strict",
            importNames: ["AssertionError"],
            message: "AssertionError must be imported from node:assert.",
          },
          {
            name: "node:assert",
            importNames: [
              "default",
              ...Object.keys(assert).filter((k) => k !== "AssertionError"),
            ],
            message: "Use node:assert/strict instead.",
          },
          {
            name: "zod",
            importNames: ["union"],
            message:
              "Use the conditionalUnionType or unionType helpers from the zod utils package instead, as it provides better error messages.",
          },
        ],
      },
    ],
  };

  /**
   * @type {import("typescript-eslint").ConfigWithExtends}
   */
  const config = {
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parser: tseslint.parser,
      parserOptions: {
        project: path.join(path.dirname(configFilePath), "tsconfig.json"),
        tsconfigRootDir: path.dirname(configFilePath),
        projectService: true,
      },
    },
    settings: {
      "import/resolver": {
        typescript: true,
        node: true,
      },
    },
    plugins: {
      import: importPlugin,
      "no-only-tests": noOnlyTestsPlugin,
      "@typescript-eslint": tseslint.plugin,
      "@eslint-community/eslint-comments": eslintCommentsPlugin,
    },
    rules,
    files: ["src/**/*.ts", "test/**/*.ts", "integration-tests/**/*.ts"],
    ignores: ["test/**/fixture-projects/**"],
  };

  /**
   * @type {import("typescript-eslint").ConfigWithExtends}
   */
  const testFilesConfig = {
    files: ["test/**/*.ts", "integration-tests/**/*.ts"],
    ignores: ["test/**/fixture-projects/**"],
    plugins: {
      import: importPlugin,
    },
    rules: {
      "import/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: true,
        },
      ],
      // Disabled until this gets resolved https://github.com/nodejs/node/issues/51292
      "@typescript-eslint/no-floating-promises": "off",
    },
  };

  /**
   * @type {import("typescript-eslint").ConfigWithExtends}
   */
  const onlyHardhatErrorConfig = {
    files: ["src/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        ...noRestrictedSyntaxRules,
        {
          // This is a best effor selector that forbids every throw unless it's a `new HardhatError`,
          // or throwing a variable within a catch clause.
          selector:
            "ThrowStatement:not(:has(ThrowStatement > NewExpression[callee.name='HardhatError']), CatchClause ThrowStatement:has(ThrowStatement > Identifier))",
          message:
            "Invalid throw expression. Only throwing a new HardhatError and rethrowing an error you caught are allowed",
        },
      ],
    },
  };

  return tseslint.config(
    config,
    testFilesConfig,
    options.onlyHardhatError ? onlyHardhatErrorConfig : {},
  );
}
