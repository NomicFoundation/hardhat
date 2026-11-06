import type { UserInterruptionManager } from "hardhat/types/user-interruptions";

import {
  DeploymentResultType,
  ExecutionEventResultType,
  ExecutionEventType,
} from "@nomicfoundation/ignition-core";
import { assert } from "chai";
import sinon from "sinon";

import { PrettyEventHandler } from "../../src/helpers/pretty-event-handler.js";

const interruptions: UserInterruptionManager = {
  displayMessage: async () => {},
  requestInput: async () => "",
  requestSecretInput: async () => "",
  async uninterrupted<ReturnT>(f: () => ReturnT): Promise<Awaited<ReturnT>> {
    return await f();
  },
};

/**
 * Sends the handler the events of a successful deployment with two batches:
 * `MyModule#Bar` and `MyModule#Foo` in the first, `MyModule#Foo.inc` in the
 * second.
 */
async function deployTwoBatches(handler: PrettyEventHandler): Promise<void> {
  await handler.deploymentStart({
    type: ExecutionEventType.DEPLOYMENT_START,
    moduleName: "MyModule",
    deploymentDir: "/deployments/chain-31337",
    isResumed: false,
    maxFeeBumps: 0,
    disableFeeBumping: false,
  });
  await handler.batchInitialize({
    type: ExecutionEventType.BATCH_INITIALIZE,
    batches: [["MyModule#Bar", "MyModule#Foo"], ["MyModule#Foo.inc"]],
  });

  const complete = async (futureId: string) =>
    await handler.deploymentExecutionStateComplete({
      type: ExecutionEventType.DEPLOYMENT_EXECUTION_STATE_COMPLETE,
      futureId,
      result: {
        type: ExecutionEventResultType.SUCCESS,
        result: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      },
    });

  await handler.beginNextBatch({
    type: ExecutionEventType.BEGIN_NEXT_BATCH,
  });
  await complete("MyModule#Bar");
  await complete("MyModule#Foo");
  await handler.beginNextBatch({
    type: ExecutionEventType.BEGIN_NEXT_BATCH,
  });
  await complete("MyModule#Foo.inc");
  await handler.deploymentComplete({
    type: ExecutionEventType.DEPLOYMENT_COMPLETE,
    result: {
      type: DeploymentResultType.SUCCESSFUL_DEPLOYMENT,
      contracts: {},
    },
  });
}

describe("ui - pretty event handler", () => {
  let originalIsTTY: boolean;

  beforeEach(() => {
    originalIsTTY = process.stdout.isTTY;
  });

  afterEach(() => {
    process.stdout.isTTY = originalIsTTY;
  });

  describe("when stdout is not a TTY", () => {
    beforeEach(() => {
      process.stdout.isTTY = false;
    });

    it("should print each batch once, then only the lines that changed", async () => {
      const logs: string[] = [];
      sinon.stub(console, "log").callsFake((text: string = "") => {
        logs.push(text);
      });
      const write = sinon.stub(process.stdout, "write");

      await deployTwoBatches(new PrettyEventHandler(interruptions));

      write.restore();

      // The first log is the starting message, and the last one the
      // deployment complete panel.
      assert.deepEqual(logs.slice(1, -1), [
        "Batch #1\n  Executing MyModule#Bar...\n  Executing MyModule#Foo...",
        "  Executed MyModule#Bar",
        "  Executed MyModule#Foo",
        "\nBatch #2\n  Executing MyModule#Foo.inc...",
        "  Executed MyModule#Foo.inc",
        "",
      ]);

      // The starting message ends its line, as it can't be cleared.
      assert.include(logs[0], "Hardhat Ignition starting for [ MyModule ]...");
      // No cursor movement or clearing escape codes were written.
      assert.isFalse(
        write.getCalls().some((call) => String(call.args[0]).includes("\x1b[")),
      );
    });
  });

  describe("when stdout is a TTY", () => {
    beforeEach(() => {
      process.stdout.isTTY = true;
    });

    it("should redraw the current batch in place on every update", async () => {
      // Everything sent to stdout, in order, with console.log's newline
      const output: string[] = [];
      sinon.stub(console, "log").callsFake((text: string = "") => {
        output.push(`${text}\n`);
      });
      const write = sinon
        .stub(process.stdout, "write")
        .callsFake((chunk: string | Uint8Array) => {
          output.push(String(chunk));
          return true;
        });

      await deployTwoBatches(new PrettyEventHandler(interruptions));

      write.restore();

      // Moves the cursor up over the batch's header, futures, and empty line,
      // and clears them
      const clearBatch1 = ["\x1b[4A", "\x1b[J"];
      const clearBatch2 = ["\x1b[3A", "\x1b[J"];

      const batch1Executed =
        "Batch #1\n  Executed MyModule#Bar\n  Executed MyModule#Foo\n\n";
      const batch2Executed = "Batch #2\n  Executed MyModule#Foo.inc\n\n";

      // The last output is the deployment complete panel
      assert.deepEqual(output.slice(0, -1), [
        // Without a newline, so the deploying panel can replace it
        "Hardhat Ignition starting for [ MyModule ]...",
        "Batch #1\n  Executing MyModule#Bar...\n  Executing MyModule#Foo...\n\n",
        ...clearBatch1,
        "Batch #1\n  Executed MyModule#Bar\n  Executing MyModule#Foo...\n\n",
        ...clearBatch1,
        batch1Executed,
        // Starting the next batch redraws the previous one first
        ...clearBatch1,
        batch1Executed,
        "Batch #2\n  Executing MyModule#Foo.inc...\n\n",
        ...clearBatch2,
        batch2Executed,
        // Completing the deployment redraws the last batch
        ...clearBatch2,
        batch2Executed,
      ]);
    });
  });
});
