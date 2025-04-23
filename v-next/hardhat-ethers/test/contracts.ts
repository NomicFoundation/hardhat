import type { ExampleContract } from "./helpers/example-contracts.js";
import type { HardhatEthers } from "../src/types.js";
import type { EthereumProvider } from "hardhat/types/providers";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { EXAMPLE_CONTRACT } from "./helpers/example-contracts.js";
import { initializeTestEthers, sleep } from "./helpers/helpers.js";

describe("contracts", () => {
  let ethers: HardhatEthers;
  let ethereumProvider: EthereumProvider;

  beforeEach(async () => {
    ({ ethers, provider: ethereumProvider } = await initializeTestEthers());
  });

  it("should wait for deployment when automining is enabled", async () => {
    const signer = await ethers.provider.getSigner(0);

    const factory = new ethers.ContractFactory<[], ExampleContract>(
      EXAMPLE_CONTRACT.abi,
      EXAMPLE_CONTRACT.deploymentBytecode,
      signer,
    );

    const contract = await factory.deploy();

    await contract.waitForDeployment();
  });

  it("should wait for deployment when automining is disabled", async () => {
    const signer = await ethers.provider.getSigner(0);

    const factory = new ethers.ContractFactory<[], ExampleContract>(
      EXAMPLE_CONTRACT.abi,
      EXAMPLE_CONTRACT.deploymentBytecode,
      signer,
    );

    await ethereumProvider.request({
      method: "evm_setAutomine",
      params: [false],
    });

    const contract = await factory.deploy();

    let deployed = false;
    const waitForDeploymentPromise = contract.waitForDeployment().then(() => {
      deployed = true;
    });

    assert.equal(deployed, false);
    await sleep(10);
    assert.equal(deployed, false);

    await ethereumProvider.request({ method: "hardhat_mine" });
    await waitForDeploymentPromise;
    assert.equal(deployed, true);
  });

  it("should wait for multiple deployments at the same time", async () => {
    const signer = await ethers.provider.getSigner(0);

    const factory = new ethers.ContractFactory<[], ExampleContract>(
      EXAMPLE_CONTRACT.abi,
      EXAMPLE_CONTRACT.deploymentBytecode,
      signer,
    );

    await ethereumProvider.request({
      method: "evm_setAutomine",
      params: [false],
    });

    // we set the gas limit so that the 3 txs fit in a block
    const contract1 = await factory.deploy({ gasLimit: 1_000_000 });
    const contract2 = await factory.deploy({ gasLimit: 1_000_000 });
    const contract3 = await factory.deploy({ gasLimit: 1_000_000 });

    const allDeployedPromise = Promise.all([
      contract1.waitForDeployment(),
      contract2.waitForDeployment(),
      contract3.waitForDeployment(),
    ]);

    let deployed = false;
    const waitForDeploymentPromise = allDeployedPromise.then(() => {
      deployed = true;
    });

    assert.equal(deployed, false);
    await sleep(10);
    assert.equal(deployed, false);

    await ethereumProvider.request({ method: "hardhat_mine" });
    await waitForDeploymentPromise;
    assert.equal(deployed, true);

    await ethereumProvider.request({
      method: "evm_setAutomine",
      params: [true],
    });
  });

  it("should wait for an event using .on", async () => {
    const signer = await ethers.provider.getSigner(0);

    const factory = new ethers.ContractFactory<[], ExampleContract>(
      EXAMPLE_CONTRACT.abi,
      EXAMPLE_CONTRACT.deploymentBytecode,
      signer,
    );

    const contract = await factory.deploy();

    let listener: any;
    const eventPromise = new Promise((resolve) => {
      listener = resolve;
      return contract.on("Inc", resolve);
    });

    await contract.inc();

    await eventPromise;

    await contract.off("Inc", listener);
  });

  it("should wait for an event using .once", async () => {
    const signer = await ethers.provider.getSigner(0);

    const factory = new ethers.ContractFactory<[], ExampleContract>(
      EXAMPLE_CONTRACT.abi,
      EXAMPLE_CONTRACT.deploymentBytecode,
      signer,
    );

    const contract = await factory.deploy();

    const eventPromise = new Promise((resolve) => {
      return contract.once("Inc", resolve);
    });

    await contract.inc();

    await eventPromise;
  });

  it("should work with ContractEvent objects", async () => {
    const signer = await ethers.provider.getSigner(0);

    const factory = new ethers.ContractFactory<[], ExampleContract>(
      EXAMPLE_CONTRACT.abi,
      EXAMPLE_CONTRACT.deploymentBytecode,
      signer,
    );

    const contract = await factory.deploy();

    const contractEvent = contract.getEvent("Inc");

    let listener: any;
    const eventPromise = new Promise((resolve) => {
      listener = resolve;
      return contract.on(contractEvent, resolve);
    });

    await contract.inc();

    await eventPromise;

    await contract.off(contractEvent, listener);
  });

  it("should be able to wait for indexed events", async () => {
    const signer = await ethers.provider.getSigner(0);

    const factory = new ethers.ContractFactory<[], ExampleContract>(
      EXAMPLE_CONTRACT.abi,
      EXAMPLE_CONTRACT.deploymentBytecode,
      signer,
    );

    const contract = await factory.deploy();

    let listener: any;
    const eventPromise = new Promise((resolve) => {
      listener = resolve;
      return contract.on("IncBy", resolve);
    });

    await contract.incBy();

    await eventPromise;

    await contract.off("IncBy", listener);
  });

  it("shouldn't trigger a listener for an unrelated event", async () => {
    const signer = await ethers.provider.getSigner(0);

    const factory = new ethers.ContractFactory<[], ExampleContract>(
      EXAMPLE_CONTRACT.abi,
      EXAMPLE_CONTRACT.deploymentBytecode,
      signer,
    );

    const contract = await factory.deploy();

    let listener: any;
    let listenerTriggered = false;
    const eventPromise = new Promise<void>((resolve) => {
      listener = () => {
        listenerTriggered = true;
        resolve();
      };
      return contract.on("IncBy", listener);
    });

    // call a function that doesn't trigger IncBy
    await contract.inc();

    // contract events are implemented by polling the network, so we have to wait
    // some time to be sure that the event wasn't emitted
    await Promise.race([eventPromise, sleep(250)]);

    assert.equal(listenerTriggered, false);

    await contract.off("IncBy", listener);
  });

  it("should work when a tx emits multiple transactions", async () => {
    const signer = await ethers.provider.getSigner(0);

    const factory = new ethers.ContractFactory<[], ExampleContract>(
      EXAMPLE_CONTRACT.abi,
      EXAMPLE_CONTRACT.deploymentBytecode,
      signer,
    );

    const contract = await factory.deploy();

    let listenerInc: any;
    const incEventPromise = new Promise<void>((resolve) => {
      listenerInc = resolve;
      return contract.on("Inc", listenerInc);
    });

    let listenerAnotherEvent: any;
    const anotherEventPromise = new Promise<void>((resolve) => {
      listenerAnotherEvent = resolve;
      return contract.on("AnotherEvent", listenerAnotherEvent);
    });

    // call a function that doesn't trigger IncBy
    await contract.emitsTwoEvents();

    await Promise.all([incEventPromise, anotherEventPromise]);

    await contract.off("Inc", listenerInc);
    await contract.off("AnotherEvent", listenerAnotherEvent);
  });

  it("should work when the same transaction emits the same event twice", async () => {
    const signer = await ethers.provider.getSigner(0);

    const factory = new ethers.ContractFactory<[], ExampleContract>(
      EXAMPLE_CONTRACT.abi,
      EXAMPLE_CONTRACT.deploymentBytecode,
      signer,
    );

    const contract = await factory.deploy();

    let listenerInc: any;
    let timesCalled = 0;
    const incEventPromise = new Promise<void>((resolve) => {
      listenerInc = () => {
        timesCalled++;
        if (timesCalled === 2) {
          resolve();
        }
      };
      return contract.on("Inc", listenerInc);
    });

    await contract.incTwice();

    await incEventPromise;

    assert.equal(timesCalled, 2);

    await contract.off("Inc", listenerInc);
  });
});
