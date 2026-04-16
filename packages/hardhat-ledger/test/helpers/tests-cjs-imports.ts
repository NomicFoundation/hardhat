/**
 * @file See the comment in `src/internal/cjs-imports.ts`
 *
 * This is an equivalent file, but with test-only imports.
 */

import type { TransportT as TransportNodeHidT } from "../../src/internal/cjs-imports.js";
import type TransportT from "@ledgerhq/hw-transport";

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

type BaseTransportClass = (typeof TransportT)["default"];

const hwTransport: {
  default: BaseTransportClass;
} = require("@ledgerhq/hw-transport");
const BaseTransport: BaseTransportClass = hwTransport.default;

export { BaseTransport };
export { TransportNodeHidT };
