import { describe, it } from "node:test";
import { network } from "hardhat";
// We don't have Ethereum specific assertions in Hardhat 3 yet
import assert from "node:assert/strict";

/*
 * `node:test` uses `describe` and `it` to define tests, similar to Mocha.
 * `describe` blocks support async functions, simplifying the setup of tests.
 */
describe("Counter", async function () {
  /*
   * In Hardhat 3, there isn't a single global connection to a network. Instead,
   * you have a `network` object that allows you to connect to different
   * networks.
   *
   * You can create multiple network connections using `network.connect`.
   * It takes two optional parameters and returns a `NetworkConnection` object.
   *
   * Its parameters are:
   *
   * 1. The name of the network configuration to use (from `config.networks`).
   *
   * 2. The `ChainType` to use.
   *
   * Providing a `ChainType` ensures the connection is aware of the kind of
   * chain it's using, potentially affecting RPC interactions for HTTP
   * connections, and changing the simulation behavior for EDR networks.
   * It also ensures the network connection has the correct TypeScript type and
   * viem extensions (e.g. Optimisim L2 actions).
   *
   * If you don't provide a `ChainType`, it will be inferred from the network
   * config, and default to `generic` if not specified in the config. In either
   * case, the connection will have a generic TypeScript type and no viem
   * extensions.
   *
   * Every time you call `network.connect` with an EDR network config name, a
   * new instance of EDR will be created. Each of these instances has its own
   * state and blockchain, and they have no communication with each other.
   *
   * Examples:
   *
   * - `await network.connect("sepolia", "l1")`: Connects to the
   *   `sepolia` network config, treating it as an "l1" network with the
   *   appropriate viem extensions.
   *
   * - `await network.connect("hardhatOp", "optimism")`: Creates a new EDR
   *   instance in Optimism mode, using the `hardhatOp` network config.
   *
   * - `await network.connect()`: Creates a new EDR instance with the default
   *    network config (i.e. `hardhat`), the `generic` chain type, and no
   *    viem extensions.
   *
   * Each network connection object has a `provider` property and other
   * network-related fields added by plugins, like `viem` and `networkHelpers`.
   */
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  it("The sum of the Increment events should match the current value", async function () {
    const vault = await viem.deployContract("Counter");

    // run a series of increments
    for (let i = 1n; i <= 10n; i++) {
      await vault.write.incBy([i]);
    }

    const events = await publicClient.getContractEvents({
      address: vault.address,
      abi: vault.abi,
      eventName: "Increment",
      fromBlock: 0n,
      strict: true,
    });

    // check that the aggregated events match the current value
    let total = 0n;
    for (const event of events) {
      total += event.args.by;
    }

    assert.equal(total, await vault.read.x());
  });
});
