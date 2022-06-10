# Migrating from Waffle

This page explains how to migrate from Waffle to Hardhat Chai Matchers, and the advantages of doing it.

## How to migrate

The `@nomicfoundation/hardhat-chai-matchers` plugin is meant to be a drop-in replacement for the `@nomiclabs/hardhat-waffle` plugin. To migrate, follow these instructions:

1. Uninstall the `@nomiclabs/hardhat-waffle` and `ethereum-waffle` packages:

   ::::tabsgroup{options=npm,yarn}

   :::tab{value=npm}

   ```
   npm uninstall @nomiclabs/hardhat-waffle ethereum-waffle
   ```

   :::

   :::tab{value=yarn}

   ```
   yarn remove @nomiclabs/hardhat-waffle ethereum-waffle
   ```

   :::

   ::::

2. Then install the Hardhat Chai Matchers plugin:

   ::::tabsgroup{options=npm,yarn}

   :::tab{value=npm}

   ```
   npm install @nomicfoundation/hardhat-chai-matchers
   ```

   :::

   :::tab{value=yarn}

   ```
   yarn add @nomicfoundation/hardhat-chai-matchers
   ```

   :::

   ::::

3. In your Hardhat config, import the Hardhat Chai Matchers plugin and remove the `hardhat-waffle` one:

   ::::tabsgroup{options=TypeScript,JavaScript}

   :::tab{value=TypeScript}

   ```diff
   - import "@nomiclabs/hardhat-waffle";
   + import "@nomicfoundation/hardhat-chai-matchers";
   ```

   :::

   :::tab{value=JavaScript}

   ```diff
   - require("@nomiclabs/hardhat-waffle");
   + require("@nomicfoundation/hardhat-chai-matchers");
   ```

   :::

   ::::

4. If you were not importing the `@nomiclabs/hardhat-ethers` plugin explicitly (because the Hardhat Waffle plugin already imported it), then add it to your config:

   ::::tabsgroup{options=TypeScript,JavaScript}

   :::tab{value=TypeScript}

   ```ts
   import "@nomiclabs/hardhat-ethers";
   ```

   :::

   :::tab{value=JavaScript}

   ```js
   require("@nomiclabs/hardhat-ethers");
   ```

   :::

   ::::

## Why migrate?

The Hardhat Chai Matchers are compatible with Waffle's API and offer several advantages:

- **More features**: the Hardhat Chai Matchers include new matchers, like [`.revertedWithCustomError`](/chai-matchers/reference#.revertedwithcustomerror) and [`.revertedWithPanic`](/chai-matchers/reference.md#.revertedwithpanic), which let you perform better assertions of a transaction's revert reason.
- **Support for native BigInts**: Besides numbers and ethers’s BigNumbers, you can also use JavaScript's native BigInts in your assertions, which means being able to do things like `expect(await token.totalSupply()).to.equal(10n**18n)` instead of `expect(await token.totalSupply()).to.equal(ethers.BigNumber.from("1000000000000000000"))`.
- **More reliable**: Several problems and minor bugs in Waffle's matchers are fixed in the Hardhat Chai Matchers.
