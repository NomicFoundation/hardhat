/**
 * Mock implementation of the `TransportNodeHid` class from `@ledgerhq/hw-transport-node-hid`.
 * This mock initializes a new base `Transport` instance (from `@ledgerhq/hw-transport`) and
 * exposes only the create method, which is the sole method used by hardhat-ledger.
 */

import type { TransportNodeHidT } from "./tests-cjs-imports.js";

import { BaseTransport } from "./tests-cjs-imports.js";

export interface TransportMockState {
  createCount: number;
}

export function getTransportNodeHidMock(
  state?: TransportMockState,
): TransportNodeHidT {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- this is a mock for testing purpose
  const transportNodeHid = {
    create: () => {
      if (state !== undefined) {
        state.createCount++;
      }
      return new BaseTransport();
    },
  } as unknown as TransportNodeHidT;

  return transportNodeHid;
}
