# Migrating from Waffle

If you want to replace Waffle with Hardhat Chai Matchers, we recommend you [migrate to the Hardhat Toolbox](/hardhat-runner/docs/guides/migrating-from-hardhat-waffle). If for some reason you want to migrate without using the Toolbox, read on.

## How to migrate

The `@nomicfoundation/hardhat-chai-matchers` plugin is meant to be a drop-in replacement for the `@nomiclabs/hardhat-waffle` plugin. To migrate, follow these instructions:

1. Uninstall the `@nomiclabs/hardhat-waffle` and `ethereum-waffle` packages:

   ::::tabsgroup{options="npm 7+,npm 6,yarn,pnpm"}

   :::tab{value="npm 7+"}

   ```
   npm uninstall @nomiclabs/hardhat-waffle ethereum-waffle
   ```

   :::

   :::tab{value="npm 6"}

   ```
   npm uninstall @nomiclabs/hardhat-waffle ethereum-waffle
   ```

   :::

   :::tab{value=yarn}

   ```
   yarn remove @nomiclabs/hardhat-waffle ethereum-waffle
   ```

   :::

   :::tab{value="pnpm"}

   ```
   pnpm remove @nomiclabs/hardhat-waffle ethereum-waffle
   ```

   :::

   ::::

2. Then install the Hardhat Chai Matchers plugin:

   ::::tabsgroup{options="npm 7+,npm 6,yarn,pnpm"}

   :::tab{value="npm 7+"}

   ```
   npm install --save-dev @nomicfoundation/hardhat-chai-matchers
   ```

   :::

   :::tab{value="npm 6"}

   ```
   npm install --save-dev @nomicfoundation/hardhat-chai-matchers
   ```

   :::

   :::tab{value=yarn}

   ```
   yarn add --dev @nomicfoundation/hardhat-chai-matchers
   ```

   :::

   :::tab{value="pnpm"}

   ```
   pnpm add -D @nomicfoundation/hardhat-chai-matchers
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

:::tip

Looking for a replacement for Waffle's `loadFixture`? You can find our version of it in [Hardhat Network Helpers](/hardhat-network-helpers/docs/reference#fixtures).

:::
