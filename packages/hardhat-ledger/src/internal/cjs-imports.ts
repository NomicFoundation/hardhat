/**
 * @file This file exists to workaround an issue in `@ledgerhq/errors`, because
 * its ESM build is broken.
 *
 * See: https://github.com/LedgerHQ/ledger-live/issues/15967
 *
 * While we can pin the version of `@ledgerhq/errors` that we use directly,
 * other ledger packages have different version ranges, and we can end up with
 * multiple installations and still hit the error.
 *
 * The workaround consists on importing the CJS version of the package, by using
 * `createRequire` to `require` it, instead of `import`ing it.
 *
 * Given that the rest of the packages can also `import` `@ledgerhq/errors`, we
 * need to `require` every ledger package to be safe, otherwise Node will fail
 * if we mix `import` and `require` of the same package.
 */

import type * as LedgerErrorsT from "@ledgerhq/errors";
import type * as EvmToolsLibIndexT from "@ledgerhq/evm-tools/lib/index";
import type HwAppEthT from "@ledgerhq/hw-app-eth";
import type HwTransportNodeHidT from "@ledgerhq/hw-transport-node-hid";
import type { EIP712Message } from "@ledgerhq/types-live";

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// Note: `typeof HwAppEthT` / `typeof HwTransportNodeHidT` are the module
//  namespace types. Indexing them with ["default"] narrows to the exported
//  class constructor, while `typeof HwAppEthT.default` collapses back to the
//  namespace type.
type EthClass = (typeof HwAppEthT)["default"];
type LedgerService = (typeof HwAppEthT)["ledgerService"];
type TransportNodeHidClass = (typeof HwTransportNodeHidT)["default"];
type LedgerEthTransactionResolution = NonNullable<
  Parameters<InstanceType<EthClass>["signTransaction"]>[2]
>;

const ledgerErrors: typeof LedgerErrorsT = require("@ledgerhq/errors");
const evmToolsLibIndex: typeof EvmToolsLibIndexT = require("@ledgerhq/evm-tools/lib/index");
const hwAppEth: {
  default: EthClass;
  ledgerService: LedgerService;
} = require("@ledgerhq/hw-app-eth");
const hwTransport: {
  default: TransportNodeHidClass;
} = require("@ledgerhq/hw-transport-node-hid");

const DisconnectedDevice: typeof ledgerErrors.DisconnectedDevice =
  ledgerErrors.DisconnectedDevice;
const DisconnectedDeviceDuringOperation: typeof ledgerErrors.DisconnectedDeviceDuringOperation =
  ledgerErrors.DisconnectedDeviceDuringOperation;
const LockedDeviceError: typeof ledgerErrors.LockedDeviceError =
  ledgerErrors.LockedDeviceError;
const TransportError: typeof ledgerErrors.TransportError =
  ledgerErrors.TransportError;
const TransportStatusError: typeof ledgerErrors.TransportStatusError =
  ledgerErrors.TransportStatusError;

const isEIP712Message: typeof evmToolsLibIndex.isEIP712Message =
  evmToolsLibIndex.isEIP712Message;

const Eth: EthClass = hwAppEth.default;
const ledgerService: LedgerService = hwAppEth.ledgerService;

const Transport: TransportNodeHidClass = hwTransport.default;

export {
  DisconnectedDevice,
  DisconnectedDeviceDuringOperation,
  LockedDeviceError,
  TransportError,
  TransportStatusError,
};

export { isEIP712Message };
export type { EIP712Message, LedgerEthTransactionResolution };
export { Eth, ledgerService };
export { Transport };
export type TransportT = typeof Transport;
