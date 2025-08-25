import type TransportNodeHid from "@ledgerhq/hw-transport-node-hid";

import Transport from "@ledgerhq/hw-transport";

/**
 * Mock implementation of the `TransportNodeHid` class from `@ledgerhq/hw-transport-node-hid`.
 * This mock initializes a new Transport instance and exposes only the create method, which is the sole method used by hardhat-ledger.
 */

export function getTransportNodeHidMock(): typeof TransportNodeHid.default {
  const transport = new Transport.default();

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- this is a mock for testing purpose
  const transportNodeHid = {
    create: () => transport,
  } as unknown as typeof TransportNodeHid.default;

  return transportNodeHid;
}
