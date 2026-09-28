/**
 * The Device Management Kit's own error classes, required through CommonJS as
 * in `src/internal/dmk-imports.ts`.
 */

import type * as DmkT from "@ledgerhq/device-management-kit";
import type * as NodeHidT from "@ledgerhq/device-transport-kit-node-hid";

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const dmk: typeof DmkT = require("@ledgerhq/device-management-kit");
const nodeHid: typeof NodeHidT = require("@ledgerhq/device-transport-kit-node-hid");

export const OpeningConnectionError: typeof dmk.OpeningConnectionError =
  dmk.OpeningConnectionError;

export const NodeHidSendReportError: typeof nodeHid.NodeHidSendReportError =
  nodeHid.NodeHidSendReportError;
