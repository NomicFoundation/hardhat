/**
 * @file The Device Management Kit packages have broken ESM builds: the `import`
 * condition of `@ledgerhq/device-management-kit` resolves to a directory, and
 * the one of `@ledgerhq/device-signer-kit-ethereum` to a file that does not
 * exist. We `require` their CommonJS builds instead.
 *
 * The node-hid transport ships CommonJS only (both its `import` and `require`
 * conditions point to `lib/cjs`), so it would load either way. It is required
 * here as well so that every DMK package enters the plugin through this one
 * seam, and nothing else imports a DMK entry point directly.
 */

import type * as DmkT from "@ledgerhq/device-management-kit";
import type * as SignerEthT from "@ledgerhq/device-signer-kit-ethereum";
import type * as NodeHidT from "@ledgerhq/device-transport-kit-node-hid";

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const dmk: typeof DmkT = require("@ledgerhq/device-management-kit");
const signerEth: typeof SignerEthT = require("@ledgerhq/device-signer-kit-ethereum");
const nodeHid: typeof NodeHidT = require("@ledgerhq/device-transport-kit-node-hid");

const DeviceManagementKitBuilder: typeof dmk.DeviceManagementKitBuilder =
  dmk.DeviceManagementKitBuilder;
const DeviceActionStatus: typeof dmk.DeviceActionStatus =
  dmk.DeviceActionStatus;

const nodeHidTransportFactory: typeof nodeHid.nodeHidTransportFactory =
  nodeHid.nodeHidTransportFactory;

const SignerEthBuilder: typeof signerEth.SignerEthBuilder =
  signerEth.SignerEthBuilder;

export {
  DeviceActionStatus,
  DeviceManagementKitBuilder,
  nodeHidTransportFactory,
  SignerEthBuilder,
};

export type DeviceActionState<Output, Error, IntermediateValue> =
  DmkT.DeviceActionState<Output, Error, IntermediateValue>;
export type DeviceManagementKit = DmkT.DeviceManagementKit;
export type DeviceSessionId = DmkT.DeviceSessionId;
export type DmkError = DmkT.DmkError;
export type SignerEth = SignerEthT.SignerEth;
export type TypedData = SignerEthT.TypedData;
