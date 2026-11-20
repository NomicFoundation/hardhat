import type { ExecutionEventListener } from "@nomicfoundation/ignition-core";

import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  buildModule,
  deploy,
  DeploymentResultType,
  ExecutionEventType,
} from "@nomicfoundation/ignition-core";
import { assert } from "chai";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";
import sinon from "sinon";

import { HardhatArtifactResolver } from "../../src/helpers/hardhat-artifact-resolver.js";
import { PrettyEventHandler } from "../../src/helpers/pretty-event-handler.js";
import hardhatIgnitionPlugin from "../../src/index.js";
import { clearPendingTransactionsFromMemoryPool } from "../test-helpers/clear-pending-transactions-from-memory-pool.js";
import { sleep } from "../test-helpers/sleep.js";
import { useFileIgnitionProject } from "../test-helpers/use-ignition-project.js";

const twoContracts = buildModule("Limited", (m) => {
  const a = m.contract("Foo", [], { id: "A" });
  const b = m.contract("Foo", [], { id: "B" });
  return { a, b };
});

const onlyB = buildModule("Limited", (m) => {
  const b = m.contract("Foo", [], { id: "B" });
  return { b };
});

describe("execution - maximum batch size", function () {
  useFileIgnitionProject("minimal", "max-batch-size", {
    blockPollingInterval: 20,
  });

  it("waits for each batch to confirm before submitting the next", async function () {
    this.config.maxBatchSize = 1;
    const result = await this.runControlledDeploy(twoContracts, async (c) => {
      await c.waitForPendingTxs(1);
      // Allow multiple polling cycles without mining: the next transaction
      // must not be submitted while the current batch is unconfirmed.
      await sleep(100);
      const pending: any = await this.connection.provider.request({
        method: "eth_getBlockByNumber",
        params: ["pending", false],
      });
      assert.lengthOf(pending.transactions, 1);
      await c.mineBlock();
      await c.mineBlock(1);
    });
    assert.equal(await result.a.read.x(), 1n);
    assert.equal(await result.b.read.x(), 1n);
  });

  it("resumes pending futures before newly added futures with earlier ids", async function () {
    await this.runControlledDeploy(onlyB, async (c) => {
      await c.waitForPendingTxs(1);
      c.exitDeploy();
    });
    this.config.maxBatchSize = 1;
    const result = await this.runControlledDeploy(twoContracts, async (c) => {
      await sleep(100);
      const pending: any = await this.connection.provider.request({
        method: "eth_getBlockByNumber",
        params: ["pending", false],
      });
      assert.lengthOf(pending.transactions, 1);
      await c.mineBlock(1);
      await c.mineBlock(1);
    });
    assert.equal(await result.a.read.x(), 1n);
    assert.equal(await result.b.read.x(), 1n);
  });

  it("resends dropped transactions in nonce order when reducing the limit", async function () {
    await this.runControlledDeploy(onlyB, async (c) => {
      await c.waitForPendingTxs(1);
      c.exitDeploy();
    });
    // B has nonce 0; adding A gives it nonce 1, reversing future id order.
    await this.runControlledDeploy(twoContracts, async (c) => {
      await c.waitForPendingTxs(2);
      c.exitDeploy();
    });
    await clearPendingTransactionsFromMemoryPool(this.connection);
    this.config.maxBatchSize = 1;
    const result = await this.runControlledDeploy(twoContracts, async (c) => {
      await c.mineBlock(1);
      await c.mineBlock(1);
    });
    assert.equal(await result.a.read.x(), 1n);
    assert.equal(await result.b.read.x(), 1n);
  });

  it("resends dropped transactions in nonce order for mixed-case sender addresses", async function () {
    const [sender] = (await this.connection.provider.request({
      method: "eth_accounts",
    })) as string[];
    const definition = buildModule("MixedCase", (m) => {
      const a = m.contract("Foo", [], { id: "A", from: sender.toLowerCase() });
      const b = m.contract("Foo", [], {
        id: "B",
        from: `0x${sender.slice(2).toUpperCase()}`,
      });
      return { a, b };
    });
    await this.runControlledDeploy(definition, async (c) => {
      await c.waitForPendingTxs(2);
      c.exitDeploy();
    });
    await clearPendingTransactionsFromMemoryPool(this.connection);
    this.config.maxBatchSize = 1;
    const requests = sinon.spy(this.connection.provider, "request");
    try {
      const result = await this.runControlledDeploy(definition, async (c) => {
        // A higher nonce sent first would be queued behind the missing nonce 0,
        // leaving no executable transaction in the pending block.
        while (true) {
          const send = requests
            .getCalls()
            .find((call) => call.args[0].method === "eth_sendTransaction");
          if (send !== undefined) {
            await send.returnValue;
            break;
          }
          await sleep(10);
        }
        const pending: any = await this.connection.provider.request({
          method: "eth_getBlockByNumber",
          params: ["pending", true],
        });
        try {
          assert.lengthOf(pending.transactions, 1);
          assert.equal(pending.transactions[0].nonce, "0x0");
        } catch (error) {
          c.exitDeploy();
          throw error;
        }
        await c.mineBlock();
        await c.mineBlock(1);
      });
      assert.equal(await result.a.read.x(), 1n);
      assert.equal(await result.b.read.x(), 1n);
    } finally {
      requests.restore();
    }
  });

  it("sorts after nonce synchronization when a replacement clears an earlier nonce", async function () {
    await this.runControlledDeploy(twoContracts, async (c) => {
      await c.waitForPendingTxs(2);
      c.exitDeploy();
    });
    await clearPendingTransactionsFromMemoryPool(this.connection);
    const [sender] = (await this.connection.provider.request({
      method: "eth_accounts",
    })) as string[];
    // Replace A (nonce 0) with a confirmed user transaction. B (nonce 1)
    // was dropped and must be resent before A is assigned its new nonce 2.
    await this.connection.provider.request({
      method: "eth_sendTransaction",
      params: [
        { from: sender, to: sender, value: "0x0", nonce: "0x0", gas: "0x5208" },
      ],
    });
    await this.connection.provider.request({ method: "evm_mine" });
    this.config.maxBatchSize = 1;
    const result = await this.runControlledDeploy(twoContracts, async (c) => {
      await c.mineBlock(1);
      await c.mineBlock(1);
    });
    assert.equal(await result.a.read.x(), 1n);
    assert.equal(await result.b.read.x(), 1n);
  });

  it("reports the actual batches and skips successful futures on a rerun", async function () {
    await this.connection.provider.request({
      method: "evm_setAutomine",
      params: [true],
    });
    const events: any[] = [];
    const listener = new Proxy({} as ExecutionEventListener, {
      get: () => async (event: any) => {
        events.push(event);
      },
    });
    const accounts = (await this.connection.provider.request({
      method: "eth_accounts",
    })) as string[];
    const options = {
      config: { maxBatchSize: 1 },
      provider: this.connection.provider,
      deploymentDir: this.deploymentDir,
      artifactResolver: new HardhatArtifactResolver(this.hre.artifacts),
      ignitionModule: twoContracts,
      accounts,
      deploymentParameters: {},
      executionEventListener: listener,
    };
    assert.equal(
      (await deploy(options)).type,
      DeploymentResultType.SUCCESSFUL_DEPLOYMENT,
    );
    assert.deepEqual(
      events.filter((e) => e.type === ExecutionEventType.BATCH_INITIALIZE),
      [
        {
          type: ExecutionEventType.BATCH_INITIALIZE,
          batches: [["Limited#A"], ["Limited#B"]],
        },
      ],
    );
    assert.lengthOf(
      events.filter((e) => e.type === ExecutionEventType.BEGIN_NEXT_BATCH),
      2,
    );
    events.length = 0;
    assert.equal(
      (await deploy(options)).type,
      DeploymentResultType.SUCCESSFUL_DEPLOYMENT,
    );
    assert.deepEqual(
      events.filter((e) => e.type === ExecutionEventType.BATCH_INITIALIZE),
      [
        {
          type: ExecutionEventType.BATCH_INITIALIZE,
          batches: [],
        },
      ],
    );
    assert.lengthOf(
      events.filter((e) => e.type === ExecutionEventType.TRANSACTION_SEND),
      0,
    );
  });

  it("does not start later chunks when an earlier chunk fails", async function () {
    await this.connection.provider.request({
      method: "evm_setAutomine",
      params: [true],
    });
    const definition = buildModule("Failure", (m) => {
      const foo = m.contract("Foo");
      m.call(foo, "incByPositiveNumber", [0], { id: "A" });
      m.call(foo, "inc", [], { id: "B" });
      return { foo };
    });
    const events: any[] = [];
    const result = await deploy({
      config: { maxBatchSize: 1 },
      provider: this.connection.provider,
      artifactResolver: new HardhatArtifactResolver(this.hre.artifacts),
      ignitionModule: definition,
      accounts: (await this.connection.provider.request({
        method: "eth_accounts",
      })) as string[],
      deploymentParameters: {},
      executionEventListener: new Proxy({} as ExecutionEventListener, {
        get: () => async (event: any) => {
          events.push(event);
        },
      }),
    });
    assert.equal(result.type, DeploymentResultType.EXECUTION_ERROR);
    assert.lengthOf(
      events.filter((e) => e.type === ExecutionEventType.BEGIN_NEXT_BATCH),
      2,
    );
    assert.lengthOf(
      events.filter((e) => e.type === ExecutionEventType.TRANSACTION_SEND),
      1,
    );
    assert.isFalse(events.some((e) => e.futureId === "Failure#B"));
  });
});

describe("deploy task - maximum batch size", function () {
  it("passes the global Ignition configuration to the deployment engine", async function () {
    const projectPath = path.join(
      import.meta.dirname,
      "../fixture-projects/minimal",
    );
    const configPath = path.join(projectPath, "hardhat.config.js");
    const { default: userConfig } = await import(
      pathToFileURL(configPath).href
    );
    const hre = await createHardhatRuntimeEnvironment(
      {
        ...userConfig,
        plugins: [hardhatIgnitionPlugin],
        ignition: { maxBatchSize: 1 },
      },
      { config: configPath },
      projectPath,
    );
    const batchInitialize = sinon.spy(
      PrettyEventHandler.prototype,
      "batchInitialize",
    );
    try {
      const result = await hre.tasks.getTask(["ignition", "deploy"]).run({
        modulePath: path.join(projectPath, "ignition/modules/MyModule.js"),
      });
      assert.equal(result.type, DeploymentResultType.SUCCESSFUL_DEPLOYMENT);
      assert.isTrue(batchInitialize.calledOnce);
      assert.deepEqual(batchInitialize.firstCall.args[0].batches, [
        ["MyModule#Bar"],
        ["MyModule#UsesContract"],
        ["MyModule#UsesContract.setAddress"],
      ]);
    } finally {
      batchInitialize.restore();
    }
  });
});
