// @ts-check

const path = require("path");

/**
 * Creates a predefined config that every package inside this monorepo should use.
 *
 * Note that the config includes both the sources of the package (inside `src/`) and
 * the tests (inside `test/`), so a single config file per package is enough.
 *
 * The only packages that should not use this config are our own eslint plugins/rules.
 *
 * @param {string} configFilePath The path to the config file that is using this function.
 * @param {string[]} [packageEntryPoints=[]] The entry points of the package, expressed as relative paths from the config file.
 * @returns {import("eslint").Linter.Config}
 */
function createConfig(configFilePath, packageEntryPoints = []) {
  /**
   * @type {import("eslint").Linter.Config}
   */
  const config = {
    env: {
      browser: false,
      es2022: true,
      node: true,
    },
    extends: ["plugin:@nomicfoundation/slow-imports/recommended"],
    parser: "@typescript-eslint/parser",
    parserOptions: {
      project: path.join(path.dirname(configFilePath), "tsconfig.json"),
      tsconfigRootDir: path.dirname(configFilePath),
    },
    plugins: [
      "@nomicfoundation/hardhat-internal-rules",
      "import",
      "no-only-tests",
      "@typescript-eslint",
      "@nomicfoundation/slow-imports",
    ],
    rules: {
      "@typescript-eslint/adjacent-overload-signatures": "error",
      "@typescript-eslint/array-type": [
        "error",
        {
          default: "array-simple",
        },
      ],
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/ban-types": [
        "error",
        {
          types: {
            Object: {
              message: "Avoid using the `Object` type. Did you mean `object`?",
            },
            Boolean: {
              message:
                "Avoid using the `Boolean` type. Did you mean `boolean`?",
            },
            Function: {
              message:
                "Avoid using the `Function` type. Prefer a specific function type, like `() => void`.",
            },
            Number: {
              message: "Avoid using the `Number` type. Did you mean `number`?",
            },
            String: {
              message: "Avoid using the `String` type. Did you mean `string`?",
            },
            Symbol: {
              message: "Avoid using the `Symbol` type. Did you mean `symbol`?",
            },
          },
          extendDefaults: false,
        },
      ],
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
      "@typescript-eslint/consistent-type-assertions": "error",
      "@typescript-eslint/consistent-type-definitions": "error",
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
          leadingUnderscore: "require",
        },
        {
          selector: "enumMember",
          format: ["UPPER_CASE"],
        },
        {
          selector: "memberLike",
          modifiers: ["private"],
          format: ["camelCase"],
          leadingUnderscore: "require",
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
        {
          selector: "typeProperty",
          filter: "__hardhatContext",
          format: null,
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
        },
      ],
      "@typescript-eslint/prefer-for-of": "error",
      "@typescript-eslint/prefer-function-type": "error",
      "@typescript-eslint/prefer-namespace-keyword": "error",
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
      "@typescript-eslint/triple-slash-reference": [
        "error",
        {
          path: "always",
          types: "prefer-import",
          lib: "always",
        },
      ],
      "@typescript-eslint/unified-signatures": "error",
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
            "object",
            ["builtin", "external"],
            "parent",
            "sibling",
            "index",
          ],
        },
      ],
      "import/no-default-export": "error",
      "no-bitwise": "error",
      "no-caller": "error",
      "no-cond-assign": "error",
      "no-debugger": "error",
      "no-duplicate-case": "error",
      "@typescript-eslint/no-duplicate-imports": "error",
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
      "prefer-template": "error",
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
            "hardhat/src",
            "@nomiclabs/*/src",
            "@nomicfoundation/*/src",
          ],
        },
      ],
    },
    overrides: [
      {
        files: ["test/**/*.ts"],
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
      },
    ],
  };

  if (packageEntryPoints.length > 0) {
    const acceptableTopLevelImports = [
      "chalk",
      "debug",
      "find-up",
      "fs-extra",
      "semver",
      "source-map-support/register",
      "@nomicfoundation/hardhat-ethers",
      "hardhat/common",
      "hardhat/common/bigInt",
      "hardhat/config",
      "hardhat/plugins",
      "hardhat/types",
      "hardhat/types/artifacts",
      "hardhat/types/config",
      "hardhat/types/runtime",
      "hardhat/builtin-tasks/task-names",
      "hardhat/internal/core/errors",
      "hardhat/internal/core/providers/util",
      "hardhat/internal/util/fs-utils",
      "hardhat/utils/contract-names",
      "hardhat/utils/source-names",
    ];

    config.overrides?.push({
      files: packageEntryPoints,
      rules: {
        "@nomicfoundation/slow-imports/no-top-level-external-import": [
          "error",
          {
            ignoreModules: [...acceptableTopLevelImports],
          },
        ],
      },
    });
  }

  return config;
}

module.exports.createConfig = createConfig;
