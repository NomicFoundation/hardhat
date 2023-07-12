import { assert, use } from "chai";
import chaiAsPromised from "chai-as-promised";

import { ExampleContract, EXAMPLE_CONTRACT } from "./example-contracts";
import { useEnvironment } from "./environment";
import { sleep } from "./helpers";

use(chaiAsPromised);

describe("contracts", function () {
  useEnvironment("minimal-project");

  it("should wait for deployment when automining is enabled", async function () {
    const signer = await this.env.ethers.provider.getSigner(0);

    const factory = new this.env.ethers.ContractFactory<[], ExampleContract>(
      EXAMPLE_CONTRACT.abi,
      EXAMPLE_CONTRACT.deploymentBytecode,
      signer
    );

    const contract = await factory.deploy();

    await contract.waitForDeployment();
  });

  it("should wait for deployment when automining is disabled", async function () {
    const signer = await this.env.ethers.provider.getSigner(0);

    const factory = new this.env.ethers.ContractFactory<[], ExampleContract>(
      EXAMPLE_CONTRACT.abi,
      EXAMPLE_CONTRACT.deploymentBytecode,
      signer
    );

    await this.env.network.provider.send("evm_setAutomine", [false]);

    const contract = await factory.deploy();

    let deployed = false;
    const waitForDeploymentPromise = contract.waitForDeployment().then(() => {
      deployed = true;
    });

    assert.isFalse(deployed);
    await sleep(10);
    assert.isFalse(deployed);

    await this.env.network.provider.send("hardhat_mine");
    await waitForDeploymentPromise;
    assert.isTrue(deployed);
  });

  it("should wait for multiple deployments at the same time", async function () {
    const signer = await this.env.ethers.provider.getSigner(0);

    const factory = new this.env.ethers.ContractFactory<[], ExampleContract>(
      EXAMPLE_CONTRACT.abi,
      EXAMPLE_CONTRACT.deploymentBytecode,
      signer
    );

    await this.env.network.provider.send("evm_setAutomine", [false]);

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

    assert.isFalse(deployed);
    await sleep(10);
    assert.isFalse(deployed);

    await this.env.network.provider.send("hardhat_mine");
    await waitForDeploymentPromise;
    assert.isTrue(deployed);

    await this.env.network.provider.send("evm_setAutomine", [true]);
  });

  it("should wait for an event using .on", async function () {
    const signer = await this.env.ethers.provider.getSigner(0);

    const factory = new this.env.ethers.ContractFactory<[], ExampleContract>(
      EXAMPLE_CONTRACT.abi,
      EXAMPLE_CONTRACT.deploymentBytecode,
      signer
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

  it("should wait for an event using .once", async function () {
    const signer = await this.env.ethers.provider.getSigner(0);

    const factory = new this.env.ethers.ContractFactory<[], ExampleContract>(
      EXAMPLE_CONTRACT.abi,
      EXAMPLE_CONTRACT.deploymentBytecode,
      signer
    );

    const contract = await factory.deploy();

    const eventPromise = new Promise((resolve) => {
      return contract.once("Inc", resolve);
    });

    await contract.inc();

    await eventPromise;
  });

  it("should work with ContractEvent objects", async function () {
    const signer = await this.env.ethers.provider.getSigner(0);

    const factory = new this.env.ethers.ContractFactory<[], ExampleContract>(
      EXAMPLE_CONTRACT.abi,
      EXAMPLE_CONTRACT.deploymentBytecode,
      signer
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

  it("should be able to wait for indexed events", async function () {
    const signer = await this.env.ethers.provider.getSigner(0);

    const factory = new this.env.ethers.ContractFactory<[], ExampleContract>(
      EXAMPLE_CONTRACT.abi,
      EXAMPLE_CONTRACT.deploymentBytecode,
      signer
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

  it("shouldn't trigger a listener for an unrelated event", async function () {
    const signer = await this.env.ethers.provider.getSigner(0);

    const factory = new this.env.ethers.ContractFactory<[], ExampleContract>(
      EXAMPLE_CONTRACT.abi,
      EXAMPLE_CONTRACT.deploymentBytecode,
      signer
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

    assert.isFalse(listenerTriggered);

    await contract.off("IncBy", listener);
  });

  it("should work when a tx emits multiple transactions", async function () {
    const signer = await this.env.ethers.provider.getSigner(0);

    const factory = new this.env.ethers.ContractFactory<[], ExampleContract>(
      EXAMPLE_CONTRACT.abi,
      EXAMPLE_CONTRACT.deploymentBytecode,
      signer
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

  it("should work when the same transaction emits the same event twice", async function () {
    const signer = await this.env.ethers.provider.getSigner(0);

    const factory = new this.env.ethers.ContractFactory<[], ExampleContract>(
      EXAMPLE_CONTRACT.abi,
      EXAMPLE_CONTRACT.deploymentBytecode,
      signer
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
