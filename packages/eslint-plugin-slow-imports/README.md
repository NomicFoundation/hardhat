# @nomicfoundation/eslint-plugin-slow-imports

This plugin provides a rule for detecting slow imports of external dependencies.

## Installation

You'll first need to install [ESLint](https://eslint.org/):

```sh
npm i eslint --save-dev
```

Next, install `@nomicfoundation/eslint-plugin-slow-imports`:

```sh
npm install @nomicfoundation/eslint-plugin-slow-imports --save-dev
```

## Usage

Add `slow-imports` to the plugins section of your `.eslintrc` configuration file:

```json
{
  "plugins": ["slow-imports"]
}
```

Add `plugin:slow-imports/recommended` to the extends section of your `.eslintrc` configuration file:

```json
{
  "extends": ["plugin:slow-imports/recommended"]
}
```

Then configure the rule according to your entry points and whitelisted dependencies.

```json
{
  "rules": {
    "slow-imports/no-top-level-external-import": [
      "error",
      {
        "ignoreModules": []
      }
    ]
  }
}
```

<!-- begin auto-generated rules list -->

| Name                                                                       | Description                                           |
| :------------------------------------------------------------------------- | :---------------------------------------------------- |
| [no-top-level-external-import](docs/rules/no-top-level-external-import.md) | Enforce usage of dynamic imports for external modules |

<!-- end auto-generated rules list -->
