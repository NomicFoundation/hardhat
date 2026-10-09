import type * as DmkT from "@ledgerhq/device-management-kit";
import type * as NodeHidT from "@ledgerhq/device-transport-kit-node-hid";

import { createRequire } from "node:module";

/**
 * DMK error classes loaded through the same CommonJS workaround as production.
 */

const require = createRequire(import.meta.url);

const dmk: typeof DmkT = require("@ledgerhq/device-management-kit");
const nodeHid: typeof NodeHidT = require("@ledgerhq/device-transport-kit-node-hid");

export const OpeningConnectionError: typeof dmk.OpeningConnectionError =
  dmk.OpeningConnectionError;

export const NodeHidSendReportError: typeof nodeHid.NodeHidSendReportError =
  nodeHid.NodeHidSendReportError;
