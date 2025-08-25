[![npm](https://img.shields.io/npm/v/@nomicfoundation/hardhat-ledger.svg)](https://www.npmjs.com/package/@nomicfoundation/hardhat-ledger) [![hardhat](https://hardhat.org/buidler-plugin-badge.svg?1)](https://hardhat.org)

# hardhat-ledger

[Hardhat](https://hardhat.org) plugin for integration with a [Ledger hardware wallet](https://www.ledger.com/).

## What

This plugin extends the Hardhat provider enabling it to work with a connected Ledger wallet seamlessly.

## Installation

```bash
npm install --save-dev @nomicfoundation/hardhat-ledger
```

And add the following statement to your `hardhat.config.js`:

```js
require("@nomicfoundation/hardhat-ledger");
```

Or, if you are using TypeScript, add this to your `hardhat.config.ts`:

```js
import "@nomicfoundation/hardhat-ledger";
```

## Tasks

This plugin creates no additional tasks.

## Environment extensions

This plugin adds nothing to the Hardhat Runtime Environment.

## Provider extensions

The provider supplied by Hardhat will be extended using [`extendProvider`](https://hardhat.org/hardhat-runner/docs/advanced/building-plugins#extending-the-hardhat-provider), decorating it to be a `LedgerProvider`. Any successive calls to `extendProvider` will be added on top of this.

A `LedgerProvider` knows how to connect and interact with a Ledger wallet

## Usage

The only additional step to make this plugin work is to configure it properly through the Hardhat Config. For example, in your `hardhat.config.js`:

```js
require("@nomicfoundation/hardhat-ledger");

module.exports = {
  networks: {
    hardhat: {
      ledgerAccounts: [
        "0xa809931e3b38059adae9bc5455bc567d0509ab92",
        "0xda6a52afdae5ff66aa786da68754a227331f56e3",
        "0xbc307688a80ec5ed0edc1279c44c1b34f7746bda",
      ],
    },
  },
};
```

This will make those three accounts available to the `LedgerProvider`. If you try to send a transaction or sign something using any of those accounts, the provider will try to connect to the Ledger wallet and find a derivation path for that address. By default, the derivation paths that are tried start from `m/44'/60'/0'/0'/0` and go way up to `m/44'/60'/20'/0'/0`.

An additional (optional) configuration is possible to specify the derivation path that should be used, allowing 'legacy' or otherwise non-standard addresses to still be used with the plugin. An example of such a configuration would be:

```js
    hardhat: {
      ledgerAccounts: [...],
      ledgerOptions: {
        derivationFunction: (x) => `m/44'/60'/0'/${x}` // legacy derivation path
      }
    }
```

If you want to use the provider, you could, for example in a task:

```js
task("sign", "Sign a message", async (_, hre) => {
  const message =
    "0x5417aa2a18a44da0675524453ff108c545382f0d7e26605c56bba47c21b5e979";
  const account = "0xa809931e3b38059adae9bc5455bc567d0509ab92";

  const signature = await hre.network.provider.request({
    method: "personal_sign",
    params: [
      "0x5417aa2a18a44da0675524453ff108c545382f0d7e26605c56bba47c21b5e979",
      account,
    ],
  });

  console.log(
    "Signed message",
    message,
    "for Ledger account",
    account,
    "and got",
    signature
  );
});
```

## Errors

The package throws and exports a few [errors](https://github.com/NomicFoundation/hardhat/blob/feat/main/packages/hardhat-core/src/config.ts). In case you ever need to catch and check for them, you can use the `public static` method present on each of them. For example:

```ts
try {
  //(...)
} catch (error) {
  if (DerivationPathError.isDerivationPathError(error)) {
    // error is a DerivationPathError
  }
}
```

Same for the other errors, all have their corresponding `.isXXXError()` method.
