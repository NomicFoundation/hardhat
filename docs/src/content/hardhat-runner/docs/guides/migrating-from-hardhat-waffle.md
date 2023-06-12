# Migrating away from hardhat-waffle

In the past, our recommended setup included [Waffle], by using the [`hardhat-waffle`] plugin.

However, we now recommend using [Hardhat Toolbox], a plugin that bundles a curated set of useful packages. This set includes [Hardhat Chai Matchers] and [Hardhat Network Helpers], which work as an improved replacement for `hardhat-waffle`.

Migrating to the Toolbox only takes a few minutes. If you do so, you'll get more functionality, like support for Solidity custom errors and native `bigint` support, and a more reliable testing experience. It will also make it easier for you to keep up to date with our recommended setup.

## Migrating to Hardhat Toolbox

Follow these steps to migrate your project to Hardhat Toolbox.

1. First you'll need to remove some packages from your project.

   ::::tabsgroup{options="npm 7+,npm 6,yarn"}

   :::tab{value="npm 7+"}

   ```
   npm uninstall @nomiclabs/hardhat-waffle ethereum-waffle @nomiclabs/hardhat-ethers @nomiclabs/hardhat-etherscan chai ethers hardhat-gas-reporter solidity-coverage @typechain/hardhat typechain @typechain/ethers-v5 @ethersproject/abi @ethersproject/providers
   ```

   :::

   :::tab{value="npm 6"}

   ```
   npm uninstall @nomiclabs/hardhat-waffle ethereum-waffle @nomiclabs/hardhat-ethers @nomiclabs/hardhat-etherscan chai ethers hardhat-gas-reporter solidity-coverage @typechain/hardhat typechain @typechain/ethers-v5 @ethersproject/abi @ethersproject/providers
   ```

   :::

   :::tab{value=yarn}

   ```
   yarn remove @nomiclabs/hardhat-waffle ethereum-waffle
   ```

   :::

   ::::

2. Then you need to install the Toolbox. If you are using yarn or an old version of npm, you'll also have to install some other packages (the peer dependencies of the Toolbox).

   ::::tabsgroup{options="npm 7+,npm 6,yarn"}

   :::tab{value="npm 7+"}

   ```
   npm install --save-dev @nomicfoundation/hardhat-toolbox
   ```

   :::

   :::tab{value="npm 6"}

   ```
   npm install --save-dev @nomicfoundation/hardhat-toolbox @nomicfoundation/hardhat-network-helpers @nomicfoundation/hardhat-chai-matchers @nomiclabs/hardhat-ethers @nomiclabs/hardhat-etherscan chai ethers hardhat-gas-reporter solidity-coverage @typechain/hardhat typechain @typechain/ethers-v5 @ethersproject/abi @ethersproject/providers
   ```

   :::

   :::tab{value="yarn"}

   ```
   yarn add --dev @nomicfoundation/hardhat-toolbox @nomicfoundation/hardhat-network-helpers @nomicfoundation/hardhat-chai-matchers @nomiclabs/hardhat-ethers @nomiclabs/hardhat-etherscan chai ethers hardhat-gas-reporter solidity-coverage @typechain/hardhat typechain @typechain/ethers-v5 @ethersproject/abi @ethersproject/providers
   ```

   :::

   ::::

3. Finally, remove `hardhat-waffle` from your imported plugins and import the Toolbox instead:

   ::::tabsgroup{options=TypeScript,JavaScript}

   :::tab{value=TypeScript}

   ```diff
   - import "@nomiclabs/hardhat-waffle";
   + import "@nomicfoundation/hardhat-toolbox";
   ```

   :::

   :::tab{value=JavaScript}

   ```diff
   - require("@nomiclabs/hardhat-waffle");
   + require("@nomicfoundation/hardhat-toolbox");
   ```

   :::

   ::::

   Adding the Toolbox will make many other imports redundant, so you can remove any of these if you want:

   - `@nomiclabs/hardhat-ethers`
   - `@nomiclabs/hardhat-etherscan`
   - `hardhat-gas-reporter`
   - `solidity-coverage`
   - `@typechain/hardhat`

Check the [Hardhat Chai Matchers] and [Hardhat Network Helpers] docs to learn more about the functionality included in the Toolbox.

[waffle]: https://getwaffle.io
[`hardhat-waffle`]: ../../plugins/nomiclabs-hardhat-waffle
[hardhat chai matchers]: /hardhat-chai-matchers
[hardhat network helpers]: /hardhat-network-helpers
[hardhat toolbox]: /hardhat-runner/plugins/nomicfoundation-hardhat-toolbox
