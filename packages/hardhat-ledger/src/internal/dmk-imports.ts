import type * as DmkT from "@ledgerhq/device-management-kit";
import type * as SignerEthT from "@ledgerhq/device-signer-kit-ethereum";
import type * as NodeHidT from "@ledgerhq/device-transport-kit-node-hid";

import { createRequire } from "node:module";

/**
 * The DMK's ESM entry points are broken, and its Node HID transport is
 * CommonJS-only. Load their CommonJS builds here to isolate the workaround.
 */

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
const NodeHidTransport: typeof nodeHid.NodeHidTransport =
  nodeHid.NodeHidTransport;

const SignerEthBuilder: typeof signerEth.SignerEthBuilder =
  signerEth.SignerEthBuilder;

export {
  DeviceActionStatus,
  DeviceManagementKitBuilder,
  nodeHidTransportFactory,
  NodeHidTransport,
  SignerEthBuilder,
};

export type DeviceManagementKit = DmkT.DeviceManagementKit;
export type DeviceSessionId = DmkT.DeviceSessionId;
export type DmkError = DmkT.DmkError;
export type ExecuteDeviceActionReturnType<Output, Error, IntermediateValue> =
  DmkT.ExecuteDeviceActionReturnType<Output, Error, IntermediateValue>;
export type Signature = SignerEthT.Signature;
export type SignerEth = SignerEthT.SignerEth;
export type TypedData = SignerEthT.TypedData;
