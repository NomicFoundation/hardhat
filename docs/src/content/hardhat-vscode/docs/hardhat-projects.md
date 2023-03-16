# Hardhat projects support

Hardhat for Visual Studio Code provides enhanced functionality for Solidity files within a Hardhat project, including inline validation and quick fixes.

To take advantage of these features, use the `File` menu to `Open Folder`, and select the folder containing the `hardhat.config.{js,ts}` file.

Inline validation (the display of compiler errors and warnings against the code) is based on your Hardhat configuration file. The version of the `solc` solidity compiler used for validation is set within this file, see the [Hardhat documentation](https://hardhat.org/config/#solidity-configuration) for more details.

## Monorepo Support

Hardhat for Visual Studio Code will detect Hardhat projects (folders containing a `hardhat.config.{js,ts}` file) within a monorepo, when the root of the monorepo is opened as a workspace folder.

The Hardhat config file that is used when validating a Solidity file is shown in the Solidity section on the _Status Bar_:

![Open Config](/hardhat-vscode-images/open-config.gif "Open Config")
