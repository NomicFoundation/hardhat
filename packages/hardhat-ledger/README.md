# Hardhat Ledger plugin

This plugin allows Hardhat to integrate seamlessly with a connected [Ledger wallet](https://www.ledger.com/).

> Note: By default, the plugin only talks to your device over USB and never contacts Ledger's servers. Clear signing, which shows token amounts and ENS names on the device screen, needs those servers and is opt-in. See [Remote Ledger services](#remote-ledger-services) below.

## Installation

To install this plugin, run the following command:

```bash
npm install --save-dev @nomicfoundation/hardhat-ledger
```

When using `pnpm`, you need to include the option `--allow-build=node-hid` to permit the native build of the `node-hid` dependency:

```bash
pnpm install --save-dev --allow-build=node-hid @nomicfoundation/hardhat-ledger
```

and add the following statements to your `hardhat.config.ts` file:

```typescript
import { defineConfig } from "hardhat/config";

import hardhatLedgerPlugin from "@nomicfoundation/hardhat-ledger";

export default defineConfig({
  plugins: [hardhatLedgerPlugin],
});
```

## Configuring your Ledger accounts

In your `hardhat.config.ts` file, also add the following property to list the accounts you control via your Ledger device:

```typescript
import { defineConfig } from "hardhat/config";

export default defineConfig({
  networks: {
    yourNetworkName: {
      type: "edr-simulated",
      ledgerAccounts: [
        // Set your ledger address here
        "0xa809931e3b38059adae9bc5455bc567d0509ab92",
        "0xda6a52afdae5ff66aa786da68754a227331f56e3",
        "0xbc307688a80ec5ed0edc1279c44c1b34f7746bda",
      ],
    },
  },
});
```

This will make those three accounts available to the Hardhat. If you try to send a transaction or sign something using any of those accounts, the plugin will try to connect to the Ledger wallet and find a derivation path for that address. By default, the derivation paths that are tried start from `m/44'/60'/0'/0'/0` and go up to `m/44'/60'/20'/0'/0`.

An optional `derivationFunction` configuration allows setting the derivation path, supporting 'legacy' or otherwise non-standard addresses:

```typescript
import { defineConfig } from "hardhat/config";

export default defineConfig({
  networks: {
    yourNetworkName: {
      type: "edr",
      ledgerAccounts: [...],
      ledgerOptions: {
        derivationFunction: (x) => `m/44'/60'/0'/${x}` // legacy derivation path
      }
    },
  },
});
```

## Remote Ledger services

By default, the plugin never contacts Ledger's servers. The device then shows raw addresses and amounts, and typed data is signed as a hash.

Setting `useRemoteLedgerServices` to `true` lets the Ledger Device Management Kit contact Ledger's servers when signing:

```typescript
import { defineConfig } from "hardhat/config";

export default defineConfig({
  networks: {
    yourNetworkName: {
      type: "http",
      url: "...",
      ledgerAccounts: [...],
      ledgerOptions: {
        useRemoteLedgerServices: true,
      },
    },
  },
});
```

With it enabled, when signing a transaction or typed data the kit:

- fetches the metadata the device uses to display what you are signing ("clear signing"): the token and amount for ERC-20 and NFT transfers, the ENS name of a recipient, and the network name;
- runs Ledger's transaction checks, if you enabled them on the device, by sending the transaction to Ledger;
- reports each signing event (chain id, target contract, signing method, device model, app and firmware versions, whether it was blind-signed, and a random id) to Ledger's analytics endpoint.

These requests go to Ledger, not to the network you are connected to. Contract calls are displayed the same way either way.

## Usage

To sign transactions with your Ledger, first ensure the appropriate app is open on the device. Then call the desired methods (e.g., `eth_sign`, `eth_sendTransaction`). If the sender account matches one of your Ledger accounts, the device will automatically connect, allowing you to review and either approve or decline the transaction.

Usage Example with Viem:

```typescript
import hre from "hardhat";
import { stringToHex } from "viem";

const { viem } = await hre.network.create("yourNetworkName");

const ledgerAddress = "0x..."; // Your ledger address

const [senderClient] = await viem.getWalletClients();

const hexMsg = stringToHex("Hello world");

const signature = await senderClient.request({
  method: "eth_sign",
  params: [ledgerAddress, hexMsg],
});
```

Usage Example with the provider:

```typescript
import hre from "hardhat";

const { provider, ethers } = await hre.network.create("yourNetworkName");

const ledgerAddress = "0x..."; // Your ledger address

const msg = ethers.toUtf8Bytes("Hello world");
const hexMsg = ethers.hexlify(msg);

const signature = await provider.request({
  method: "eth_sign",
  params: [ledgerAddress, hexMsg],
});
```
