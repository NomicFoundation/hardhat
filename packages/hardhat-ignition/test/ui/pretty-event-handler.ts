import type {
  BatchInitializeEvent,
  DeploymentCompleteEvent,
  DeploymentExecutionStateCompleteEvent,
  DeploymentStartEvent,
} from "@nomicfoundation/ignition-core";
import type { UserInterruptionManager } from "hardhat/types/user-interruptions";

import {
  DeploymentResultType,
  ExecutionEventResultType,
  ExecutionEventType,
} from "@nomicfoundation/ignition-core";
import { assert } from "chai";
import sinon from "sinon";

import { PrettyEventHandler } from "../../src/helpers/pretty-event-handler.js";

describe("ui - pretty event handler", () => {
  describe("when stdout is not a TTY", () => {
    let originalIsTTY: boolean;

    beforeEach(() => {
      originalIsTTY = process.stdout.isTTY;
      process.stdout.isTTY = false;
    });

    afterEach(() => {
      process.stdout.isTTY = originalIsTTY;
    });

    it("should print each batch once, then only the lines that changed", async () => {
      const logs: string[] = [];
      sinon.stub(console, "log").callsFake((text: string = "") => {
        logs.push(text);
      });
      const write = sinon.stub(process.stdout, "write");

      const interruptions = {
        uninterrupted: async (f: () => Promise<void> | void) => await f(),
      } as unknown as UserInterruptionManager;

      const handler = new PrettyEventHandler(interruptions);

      await handler.deploymentStart({
        type: ExecutionEventType.DEPLOYMENT_START,
        moduleName: "MyModule",
        deploymentDir: "/deployments/chain-31337",
        isResumed: false,
        maxFeeBumps: 0,
        disableFeeBumping: false,
      } as DeploymentStartEvent);
      await handler.batchInitialize({
        type: ExecutionEventType.BATCH_INITIALIZE,
        batches: [["MyModule#Bar", "MyModule#Foo"], ["MyModule#Foo.inc"]],
      } as BatchInitializeEvent);

      const complete = async (futureId: string) =>
        await handler.deploymentExecutionStateComplete({
          type: ExecutionEventType.DEPLOYMENT_EXECUTION_STATE_COMPLETE,
          futureId,
          result: {
            type: ExecutionEventResultType.SUCCESS,
            result: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
          },
        } as DeploymentExecutionStateCompleteEvent);

      const logsBeforeBatches = logs.length;

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
      } as DeploymentCompleteEvent);

      write.restore();

      assert.deepEqual(logs.slice(logsBeforeBatches, -1), [
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
});
