# Formatting

Hardhat for Visual Studio Code provides formatting support for `.sol` files, by leveraging [prettier-plugin-solidity](https://github.com/prettier-solidity/prettier-plugin-solidity).

## Setting it up as the default Solidity formatter

If you currently have other solidity extensions installed, or have had previously, they may be set as your default formatter for solidity files.

To set Hardhat for Visual Studio Code as your default formatter for solidity files:

1. Within a Solidity file run the _Format Document With_ command, either through the Command Palette, or by right-clicking and selecting through the context menu:

   ![Format Document With](/hardhat-vscode-images/format_document_with.png "Format Document With")

2. Select `Configure Default Formatter...`

   ![Format Document With](/hardhat-vscode-images/configure_default_formatter.png "Configure default formatter")

3. Select `Hardhat + Solidity` as the default formatter for solidity files

   ![Format Document With](/hardhat-vscode-images/select_solidity_plus_hardhat.png "Configure default formatter")

## Formatting Configuration

The default formatting rules that will be applied are taken from [prettier-plugin-solidity](https://github.com/prettier-solidity/prettier-plugin-solidity#configuration-file), with the exception that `explicitTypes` are preserved (rather than forced).

To override the settings, add a `prettierrc` configuration file at the root of your project. Add a `*.sol` file override to the prettier configuration file and change from the defaults shown:

```javascript
// .prettierrc.json
{
  "overrides": [
    {
      "files": "*.sol",
      "options": {
        "printWidth": 80,
        "tabWidth": 4,
        "useTabs": false,
        "singleQuote": false,
        "bracketSpacing": false,
        "explicitTypes": "preserve"
      }
    }
  ]
}
```
