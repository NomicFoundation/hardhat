import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { assert } from "chai";

import {
  type Artifact,
  FutureType,
  type ReadEventArgumentFuture,
} from "../src/index.js";
import { buildModule } from "../src/build-module.js";
import { getFuturesFromModule } from "../src/internal/utils/get-futures-from-module.js";
import { validateReadEventArgument } from "../src/internal/validation/futures/validateReadEventArgument.js";

import {
  assertValidationError,
  fakeArtifact,
  setupMockArtifactResolver,
} from "./helpers.js";

describe("Read event argument", () => {
  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

  describe("creating modules with it", () => {
    it("should support reading arguments from all the futures that can emit them", () => {
      const mod = buildModule("Module1", (m) => {
        const contract = m.contract("Contract");
        const contractFromArtifact = m.contract(
          "ContractFromArtifact",
          fakeArtifact,
        );
        const call = m.call(contract, "fuc");

        m.readEventArgument(contract, "EventName1", "arg1");
        m.readEventArgument(contractFromArtifact, "EventName2", "arg2");
        m.readEventArgument(call, "EventName3", "arg3");

        return { contract, contractFromArtifact };
      });

      const callFuture = Array.from(mod.futures).find(
        (f) => f.type === FutureType.CONTRACT_CALL,
      );

      const [read1, read2, read3] = Array.from(mod.futures).filter(
        (f) => f.type === FutureType.READ_EVENT_ARGUMENT,
      ) as ReadEventArgumentFuture[];

      assert.equal(read1.futureToReadFrom, mod.results.contract);
      assert.equal(read2.futureToReadFrom, mod.results.contractFromArtifact);
      assert.equal(read3.futureToReadFrom, callFuture);
    });

    it("should infer the emitter from the future correctly", () => {
      const mod = buildModule("Module1", (m) => {
        const contract = m.contract("Contract");
        const call = m.call(contract, "fuc");

        m.readEventArgument(contract, "EventName1", "arg1");
        m.readEventArgument(call, "EventName2", "arg2");

        return { contract };
      });

      const [read1, read2] = Array.from(mod.futures).filter(
        (f) => f.type === FutureType.READ_EVENT_ARGUMENT,
      ) as ReadEventArgumentFuture[];

      assert.equal(read1.emitter, mod.results.contract);
      assert.equal(read2.emitter, mod.results.contract);
    });

    it("should accept an explicit emitter", () => {
      const mod = buildModule("Module1", (m) => {
        const contract = m.contract("ContractThatCallsEmitter");
        const emitter = m.contract("ContractThatEmittsEvent2");
        const call = m.call(contract, "doSomethingAndCallThEmitter", [emitter]);

        m.readEventArgument(contract, "EventEmittedDuringConstruction", "arg1");
        m.readEventArgument(call, "Event2", "arg2", { emitter });

        return { contract, emitter };
      });

      const [read1, read2] = Array.from(mod.futures).filter(
        (f) => f.type === FutureType.READ_EVENT_ARGUMENT,
      ) as ReadEventArgumentFuture[];

      assert.equal(read1.emitter, mod.results.contract);
      assert.equal(read2.emitter, mod.results.emitter);
    });

    it("should set the right eventName and nameOrIndex", () => {
      const mod = buildModule("Module1", (m) => {
        const contract = m.contract("Contract");
        const call = m.call(contract, "fuc");

        m.readEventArgument(contract, "EventName1", "arg1");
        m.readEventArgument(call, "EventName2", 2);

        return { contract };
      });

      const [read1, read2] = Array.from(mod.futures).filter(
        (f) => f.type === FutureType.READ_EVENT_ARGUMENT,
      ) as ReadEventArgumentFuture[];

      assert.equal(read1.eventName, "EventName1");
      assert.equal(read1.nameOrIndex, "arg1");

      assert.equal(read2.eventName, "EventName2");
      assert.equal(read2.nameOrIndex, 2);
    });

    it("should default the eventIndex to 0", () => {
      const mod = buildModule("Module1", (m) => {
        const contract = m.contract("Contract");

        m.readEventArgument(contract, "EventName1", "arg1");

        return { contract };
      });

      const [read1] = Array.from(mod.futures).filter(
        (f) => f.type === FutureType.READ_EVENT_ARGUMENT,
      ) as ReadEventArgumentFuture[];

      assert.equal(read1.eventIndex, 0);
    });

    it("should accept an explicit eventIndex", () => {
      const mod = buildModule("Module1", (m) => {
        const contract = m.contract("Contract");

        m.readEventArgument(contract, "EventName1", "arg1", { eventIndex: 1 });

        return { contract };
      });

      const [read1] = Array.from(mod.futures).filter(
        (f) => f.type === FutureType.READ_EVENT_ARGUMENT,
      ) as ReadEventArgumentFuture[];

      assert.equal(read1.eventIndex, 1);
    });
  });

  describe("using the values", () => {
    it("should allow using a read value as a constructor argument and add dependency", () => {
      const mod = buildModule("Module1", (m) => {
        const emitter = m.contract("Emitter");
        const read = m.readEventArgument(emitter, "Created", "owner");

        const receiver = m.contract("Receiver", [read]);

        return { emitter, receiver };
      });

      const [read] = Array.from(mod.futures).filter(
        (f) => f.type === FutureType.READ_EVENT_ARGUMENT,
      ) as ReadEventArgumentFuture[];

      const receiverDeployment = Array.from(mod.futures).find(
        (f) =>
          f.type === FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT &&
          (f as any).contractName === "Receiver",
      );

      assert.isTrue((receiverDeployment as any).dependencies.has(read));
    });

    it("should allow using a read value as a function argument and add dependency", () => {
      const mod = buildModule("Module1", (m) => {
        const emitter = m.contract("Emitter");
        const target = m.contract("Target");
        const read = m.readEventArgument(emitter, "Created", "owner");

        m.call(target, "setOwner", [read]);

        return { emitter, target };
      });

      const [read] = Array.from(mod.futures).filter(
        (f) => f.type === FutureType.READ_EVENT_ARGUMENT,
      ) as ReadEventArgumentFuture[];

      const callFuture = Array.from(mod.futures).find(
        (f) => f.type === FutureType.CONTRACT_CALL,
      );

      assert.isTrue((callFuture as any).dependencies.has(read));
    });

    it("should allow using a read value as the value for a contract deployment", () => {
      const mod = buildModule("Module1", (m) => {
        const emitter = m.contract("Emitter");
        const read = m.readEventArgument(emitter, "ValueEmitted", 0);

        const payable = m.contract("Payable", [], { value: read });

        return { emitter, payable };
      });

      const [read] = Array.from(mod.futures).filter(
        (f) => f.type === FutureType.READ_EVENT_ARGUMENT,
      ) as ReadEventArgumentFuture[];

      const payableDeployment = Array.from(mod.futures).find(
        (f) =>
          f.type === FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT &&
          (f as any).contractName === "Payable",
      );

      assert.equal((payableDeployment as any).value, read);
      assert.isTrue((payableDeployment as any).dependencies.has(read));
    });

    it("should allow using a read value as the value for a call", () => {
      const mod = buildModule("Module1", (m) => {
        const emitter = m.contract("Emitter");
        const target = m.contract("Target");
        const read = m.readEventArgument(emitter, "ValueEmitted", 0);

        m.call(target, "deposit", [], { value: read });

        return { emitter, target };
      });

      const [read] = Array.from(mod.futures).filter(
        (f) => f.type === FutureType.READ_EVENT_ARGUMENT,
      ) as ReadEventArgumentFuture[];

      const callFuture = Array.from(mod.futures).find(
        (f) => f.type === FutureType.CONTRACT_CALL,
      );

      assert.equal((callFuture as any).value, read);
      assert.isTrue((callFuture as any).dependencies.has(read));
    });

    it("should allow using a read value as an address for send", () => {
      const mod = buildModule("Module1", (m) => {
        const emitter = m.contract("Emitter");
        const read = m.readEventArgument(emitter, "AddressEmitted", 0);

        m.send("sendToRead", read, 0n);

        return { emitter };
      });

      const [read] = Array.from(mod.futures).filter(
        (f) => f.type === FutureType.READ_EVENT_ARGUMENT,
      ) as ReadEventArgumentFuture[];

      const sendFuture = Array.from(mod.futures).find(
        (f) => f.type === FutureType.SEND_DATA,
      );

      assert.equal((sendFuture as any).to, read);
      assert.isTrue((sendFuture as any).dependencies.has(read));
    });

    it("should allow using a read value as an address for contractAt", () => {
      const mod = buildModule("Module1", (m) => {
        const emitter = m.contract("Emitter");
        const read = m.readEventArgument(emitter, "AddressEmitted", 0);

        m.contractAt("Known", read);

        return { emitter };
      });

      const [read] = Array.from(mod.futures).filter(
        (f) => f.type === FutureType.READ_EVENT_ARGUMENT,
      ) as ReadEventArgumentFuture[];

      const atFuture = Array.from(mod.futures).find(
        (f) => f.type === FutureType.NAMED_ARTIFACT_CONTRACT_AT,
      );

      assert.equal((atFuture as any).address, read);
      assert.isTrue((atFuture as any).dependencies.has(read));
    });
  });

  describe("passing ids", () => {
    it("should have a default id based on the emitter's contract name, the event name, argument and index", () => {
      const mod = buildModule("Module1", (m) => {
        const main = m.contract("Main");
        const emitter = m.contract("Emitter");

        m.readEventArgument(main, "EventName", "arg1");
        m.readEventArgument(main, "EventName2", "arg2", {
          emitter,
          eventIndex: 1,
        });

        return { main, emitter };
      });

      assert.equal(mod.id, "Module1");
      const futuresIds = Array.from(mod.futures).map((f) => f.id);

      assert.include(futuresIds, "Module1#Main.EventName.arg1.0");
      assert.include(futuresIds, "Module1#Emitter.EventName2.arg2.1");
    });

    it("should be able to read the same argument twice by passing a explicit id", () => {
      const moduleWithSameReadEventArgumentTwice = buildModule(
        "Module1",
        (m) => {
          const example = m.contract("Example");

          m.readEventArgument(example, "EventName", "arg1");
          m.readEventArgument(example, "EventName", "arg1", {
            id: "second",
          });

          return { example };
        },
      );

      assert.equal(moduleWithSameReadEventArgumentTwice.id, "Module1");
      const futuresIds = Array.from(
        moduleWithSameReadEventArgumentTwice.futures,
      ).map((f) => f.id);

      assert.include(futuresIds, "Module1#Example.EventName.arg1.0");
      assert.include(futuresIds, "Module1#second");
    });

    it("should throw if the same read event arguennet is done twice without differentiating ids", () => {
      assertThrowsHardhatError(
        () =>
          buildModule("Module1", (m) => {
            const example = m.contract("Example");

            m.readEventArgument(example, "EventName", "arg1");
            m.readEventArgument(example, "EventName", "arg1");

            return {};
          }),
        HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
        {
          message: `The autogenerated future id ("Module1#Example.EventName.arg1.0") is already used. Please provide a unique id, as shown below:

m.readEventArgument(..., { id: "MyUniqueId"})`,
        },
      );
    });

    it("should throw if a read event argument tries to pass the same id twice", () => {
      assertThrowsHardhatError(
        () =>
          buildModule("Module1", (m) => {
            const example = m.contract("Example");

            m.readEventArgument(example, "EventName", "arg1", {
              id: "ReadEvent1",
            });
            m.readEventArgument(example, "EventName", "arg1", {
              id: "ReadEvent1",
            });

            m.send("first", "0xtest", 0n, "test");
            m.send("first", "0xtest", 0n, "test");
            return {};
          }),
        HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
        {
          message: `The future id "ReadEvent1" is already used, please provide a different one.`,
        },
      );
    });
  });

  describe("validation", () => {
    describe("module stage", () => {
      it("should not validate a SendDataFuture if no emitter is provided", () => {
        assertThrowsHardhatError(
          () =>
            buildModule("Module1", (m) => {
              const send = m.send("id", exampleAddress, 42n);

              m.readEventArgument(send, "SomeEvent", "someArg");

              return {};
            }),
          HardhatError.ERRORS.IGNITION.VALIDATION.MISSING_EMITTER,
          {},
        );
      });

      it("should not validate a nameOrIndex that is not a number or string", () => {
        assertThrowsHardhatError(
          () =>
            buildModule("Module1", (m) => {
              const another = m.contract("Another", []);

              m.readEventArgument(another, "test", {} as any);

              return { another };
            }),
          HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_MODULE,
          {
            message: "Invalid nameOrIndex given",
          },
        );
      });
    });

    it("should not validate a non-existent hardhat contract", async () => {
      const module = buildModule("Module1", (m) => {
        const another = m.contract("Another", []);
        m.readEventArgument(another, "test", "arg");

        return { another };
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.READ_EVENT_ARGUMENT,
      );

      assertValidationError(
        await validateReadEventArgument(
          future as any,
          setupMockArtifactResolver({ Another: {} as any }),
          {},
          [],
        ),
        "Artifact for contract 'Another' is invalid",
      );
    });

    it("should not validate a non-existent event", async () => {
      const fakerArtifact: Artifact = {
        ...fakeArtifact,
        contractName: "Another",
      };

      const module = buildModule("Module1", (m) => {
        const another = m.contract("Another", fakerArtifact, []);
        m.readEventArgument(another, "test", "arg");

        return { another };
      });

      const future = getFuturesFromModule(module).find(
        (v) => v.type === FutureType.READ_EVENT_ARGUMENT,
      );

      assertValidationError(
        await validateReadEventArgument(
          future as any,
          setupMockArtifactResolver(),
          {},
          [],
        ),
        "Event 'test' not found in contract Another",
      );
    });
  });
});
