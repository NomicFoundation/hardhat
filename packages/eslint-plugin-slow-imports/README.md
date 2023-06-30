# eslint-plugin-slow-imports

This plugin provides a rule for detecting slow imports of external dependencies.

## Installation

You'll first need to install [ESLint](https://eslint.org/):

```sh
npm i eslint --save-dev
```

Next, install `eslint-plugin-slow-imports`:

```sh
npm install eslint-plugin-slow-imports --save-dev
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
        "entryPoints": [], // Specify the entry points as an array of strings
        "ignoreModules": [] // Optional: Specify any modules to ignore, as an array of strings
      }
    ]
  }
}
```
