import { expect } from "chai";
import { network } from "hardhat";

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
 *
 * If you don't provide a `ChainType`, it will be inferred from the network
 * config, and default to `generic` if not specified in the config.
 *
 * Every time you call `network.connect` with an EDR network config name, a
 * new instance of EDR will be created. Each of these instances has its own
 * state and blockchain, and they have no communication with each other.
 *
 * Examples:
 *
 * - `await network.connect({network: "sepolia", chainType: "l1"})`: Connects
 *   to the `sepolia` network config, treating it as an "l1" network.
 *
 * - `await network.connect(network: "hardhatOp", chainType: "op"})`:
 *   Creates a new EDR instance in Optimism mode, using the `hardhatOp`
 *   network config.
 *
 * - `await network.connect()`: Creates a new EDR instance with the default
 *    network config (i.e. `hardhat`) and the `generic` chain type.
 *
 * Each network connection object has a `provider` property and other
 * network-related fields added by plugins, like `ethers` and `networkHelpers`.
 */
const { ethers } = await network.connect();

describe("Counter", function () {
  it("Should emit the Increment event when calling the inc() function", async function () {
    const counter = await ethers.deployContract("Counter");

    // Hardhat 3 comes with chai assertions to work with ethers, like `emit` here
    await expect(counter.inc()).to.emit(counter, "Increment").withArgs(1n);
  });

  it("The sum of the Increment events should match the current value", async function () {
    const counter = await ethers.deployContract("Counter");
    const deploymentBlockNumber = await ethers.provider.getBlockNumber();

    // run a series of increments
    for (let i = 1; i <= 10; i++) {
      await counter.incBy(i);
    }

    const events = await counter.queryFilter(
      counter.filters.Increment(),
      deploymentBlockNumber,
      "latest",
    );

    // check that the aggregated events match the current value
    let total = 0n;
    for (const event of events) {
      total += event.args.by;
    }

    expect(await counter.x()).to.equal(total);
  });
});
