import { assert } from "chai";

import { FutureType, ReadEventArgumentFuture } from "../../src";
import { defineModule } from "../../src/new-api/define-module";
import { ModuleConstructor } from "../../src/new-api/internal/module-builder";

describe("Read event argument", () => {
  describe("creating modules with it", () => {
    it("should support reading arguments from all the futures that can emit them", () => {
      const fakeArtifact = {} as any;

      const defintion = defineModule("Module1", (m) => {
        const contract = m.contract("Contract");
        const contractFromArtifact = m.contractFromArtifact(
          "ContractFromArtifact",
          fakeArtifact
        );
        const call = m.call(contract, "fuc");

        m.readEventArgument(contract, "EventName1", "arg1");
        m.readEventArgument(contractFromArtifact, "EventName2", "arg2");
        m.readEventArgument(call, "EventName3", "arg3");

        return { contract, contractFromArtifact };
      });

      const constructor = new ModuleConstructor();
      const mod = constructor.construct(defintion);

      const callFuture = Array.from(mod.futures).find(
        (f) => f.type === FutureType.NAMED_CONTRACT_CALL
      );

      const [read1, read2, read3] = Array.from(mod.futures).filter(
        (f) => f.type === FutureType.READ_EVENT_ARGUMENT
      ) as ReadEventArgumentFuture[];

      assert.equal(read1.futureToReadFrom, mod.results.contract);
      assert.equal(read2.futureToReadFrom, mod.results.contractFromArtifact);
      assert.equal(read3.futureToReadFrom, callFuture);
    });

    it("should infer the emitter from the future correctly", () => {
      const defintion = defineModule("Module1", (m) => {
        const contract = m.contract("Contract");
        const call = m.call(contract, "fuc");

        m.readEventArgument(contract, "EventName1", "arg1");
        m.readEventArgument(call, "EventName2", "arg2");

        return { contract };
      });

      const constructor = new ModuleConstructor();
      const mod = constructor.construct(defintion);

      const [read1, read2] = Array.from(mod.futures).filter(
        (f) => f.type === FutureType.READ_EVENT_ARGUMENT
      ) as ReadEventArgumentFuture[];

      assert.equal(read1.emitter, mod.results.contract);
      assert.equal(read2.emitter, mod.results.contract);
    });

    it("should accept an explicit emitter", () => {
      const defintion = defineModule("Module1", (m) => {
        const contract = m.contract("ContractThatCallsEmitter");
        const emitter = m.contract("ContractThatEmittsEvent2");
        const call = m.call(contract, "doSomethingAndCallThEmitter", [emitter]);

        m.readEventArgument(contract, "EventEmittedDuringConstruction", "arg1");
        m.readEventArgument(call, "Event2", "arg2", { emitter });

        return { contract, emitter };
      });

      const constructor = new ModuleConstructor();
      const mod = constructor.construct(defintion);

      const [read1, read2] = Array.from(mod.futures).filter(
        (f) => f.type === FutureType.READ_EVENT_ARGUMENT
      ) as ReadEventArgumentFuture[];

      assert.equal(read1.emitter, mod.results.contract);
      assert.equal(read2.emitter, mod.results.emitter);
    });

    it("should set the right eventName and argumentName", () => {
      const defintion = defineModule("Module1", (m) => {
        const contract = m.contract("Contract");
        const call = m.call(contract, "fuc");

        m.readEventArgument(contract, "EventName1", "arg1");
        m.readEventArgument(call, "EventName2", "arg2");

        return { contract };
      });

      const constructor = new ModuleConstructor();
      const mod = constructor.construct(defintion);

      const [read1, read2] = Array.from(mod.futures).filter(
        (f) => f.type === FutureType.READ_EVENT_ARGUMENT
      ) as ReadEventArgumentFuture[];

      assert.equal(read1.eventName, "EventName1");
      assert.equal(read1.argumentName, "arg1");

      assert.equal(read2.eventName, "EventName2");
      assert.equal(read2.argumentName, "arg2");
    });

    it("should default the eventIndex to 0", () => {
      const defintion = defineModule("Module1", (m) => {
        const contract = m.contract("Contract");

        m.readEventArgument(contract, "EventName1", "arg1");

        return { contract };
      });

      const constructor = new ModuleConstructor();
      const mod = constructor.construct(defintion);

      const [read1] = Array.from(mod.futures).filter(
        (f) => f.type === FutureType.READ_EVENT_ARGUMENT
      ) as ReadEventArgumentFuture[];

      assert.equal(read1.eventIndex, 0);
    });

    it("should accept an explicit eventIndex", () => {
      const defintion = defineModule("Module1", (m) => {
        const contract = m.contract("Contract");

        m.readEventArgument(contract, "EventName1", "arg1", { eventIndex: 1 });

        return { contract };
      });

      const constructor = new ModuleConstructor();
      const mod = constructor.construct(defintion);

      const [read1] = Array.from(mod.futures).filter(
        (f) => f.type === FutureType.READ_EVENT_ARGUMENT
      ) as ReadEventArgumentFuture[];

      assert.equal(read1.eventIndex, 1);
    });
  });

  describe("using the values", () => {
    // TODO
  });

  describe("passing ids", () => {
    it("should have a default id based on the emitter's contract name, the event name, argument and index", () => {
      const defintion = defineModule("Module1", (m) => {
        const main = m.contract("Main");
        const emitter = m.contract("Emitter");

        m.readEventArgument(main, "EventName", "arg1");
        m.readEventArgument(main, "EventName2", "arg2", {
          emitter,
          eventIndex: 1,
        });

        return { main, emitter };
      });

      const constructor = new ModuleConstructor();
      const mod = constructor.construct(defintion);

      assert.equal(mod.id, "Module1");
      const futuresIds = Array.from(mod.futures).map((f) => f.id);

      assert.include(futuresIds, "Module1:Main#EventName#arg1#0");
      assert.include(futuresIds, "Module1:Emitter#EventName2#arg2#1");
    });

    it("should be able to read the same argument twice by passing a explicit id", () => {
      const moduleWithSameReadEventArgumentTwiceDefinition = defineModule(
        "Module1",
        (m) => {
          const example = m.contract("Example");

          m.readEventArgument(example, "EventName", "arg1");
          m.readEventArgument(example, "EventName", "arg1", {
            id: "second",
          });

          return { example };
        }
      );

      const constructor = new ModuleConstructor();
      const moduleWithSameReadEventArgumentTwice = constructor.construct(
        moduleWithSameReadEventArgumentTwiceDefinition
      );

      assert.equal(moduleWithSameReadEventArgumentTwice.id, "Module1");
      const futuresIds = Array.from(
        moduleWithSameReadEventArgumentTwice.futures
      ).map((f) => f.id);

      assert.include(futuresIds, "Module1:Example#EventName#arg1#0");
      assert.include(futuresIds, "Module1:second");
    });
  });
});
