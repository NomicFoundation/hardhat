import { assert } from "chai";

import { defineModule } from "../../src/new-api/define-module";
import {
  ArtifactContractDeploymentFutureImplementation,
  ArtifactLibraryDeploymentFutureImplementation,
  NamedContractDeploymentFutureImplementation,
  NamedLibraryDeploymentFutureImplementation,
} from "../../src/new-api/internal/module";
import { ModuleConstructor } from "../../src/new-api/internal/module-builder";
import {
  StoredDeploymentDeserializer,
  StoredDeploymentSerializer,
} from "../../src/new-api/stored-deployment-serializer";
import {
  ContractFuture,
  IgnitionModule,
  IgnitionModuleResult,
} from "../../src/new-api/types/module";
import { StoredDeployment } from "../../src/new-api/types/serialized-deployment";

describe("stored deployment serializer", () => {
  const details = {
    networkName: "hardhat",
    chainId: 31117,
  };

  describe("contract", () => {
    it("should serialize a contract deployment", () => {
      const moduleDefinition = defineModule("Module1", (m) => {
        const contract1 = m.contract("Contract1");

        return { contract1 };
      });

      const constructor = new ModuleConstructor([]);
      const module = constructor.construct(moduleDefinition);

      assertSerializableModuleIn({
        details,
        module,
      });
    });

    it("should serialize a contract deployments with dependency", () => {
      const moduleDefinition = defineModule("Module1", (m) => {
        const contract1 = m.contract("Contract1");
        const contract2 = m.contract("Contract2", [contract1]);
        const contract3 = m.contract("Contract3", [], { after: [contract2] });

        return { contract1, contract2, contract3 };
      });

      const constructor = new ModuleConstructor([]);
      const module = constructor.construct(moduleDefinition);

      assertSerializableModuleIn({
        details,
        module,
      });
    });
  });

  describe("contractFromArtifact", () => {
    const fakeArtifact = ["FAKE ARTIFACT"] as any;

    it("should serialize a contractFromArtifact deployment", () => {
      const moduleDefinition = defineModule("Module1", (m) => {
        const contract1 = m.contractFromArtifact("Contract1", fakeArtifact, []);

        return { contract1 };
      });

      const constructor = new ModuleConstructor([]);
      const module = constructor.construct(moduleDefinition);

      assertSerializableModuleIn({
        details,
        module,
      });
    });

    it("should serialize a contractFromArtifact deployment with dependency", () => {
      const moduleDefinition = defineModule("Module1", (m) => {
        const contract1 = m.contractFromArtifact("Contract1", fakeArtifact, []);

        const contract2 = m.contractFromArtifact("Contract2", fakeArtifact, [
          contract1,
        ]);

        const contract3 = m.contractFromArtifact(
          "Contract3",
          fakeArtifact,
          [],
          { after: [contract2] }
        );

        return { contract1, contract2, contract3 };
      });

      const constructor = new ModuleConstructor([]);
      const module = constructor.construct(moduleDefinition);

      assertSerializableModuleIn({
        details,
        module,
      });
    });
  });

  describe("contractAt", () => {
    it("should serialize a contractAt", () => {
      const moduleDefinition = defineModule("Module1", (m) => {
        const contract1 = m.contractAt("Contract1", "0x0");

        return { contract1 };
      });

      const constructor = new ModuleConstructor([]);
      const module = constructor.construct(moduleDefinition);

      assertSerializableModuleIn({
        details,
        module,
      });
    });

    it("should serialize a contractAt with a future address", () => {
      const moduleDefinition = defineModule("Module1", (m) => {
        const contract1 = m.contractAt("Contract1", "0x0");
        const call = m.staticCall(contract1, "getAddress");
        const contract2 = m.contractAt("Contract2", call);

        return { contract1, contract2 };
      });

      const constructor = new ModuleConstructor([]);
      const module = constructor.construct(moduleDefinition);

      assertSerializableModuleIn({
        details,
        module,
      });
    });

    it("should serialize a contractAt with dependency", () => {
      const moduleDefinition = defineModule("Module1", (m) => {
        const contract1 = m.contractAt("Contract1", "0x0");
        const contract2 = m.contractAt("Contract2", "0x0", {
          after: [contract1],
        });

        return { contract1, contract2 };
      });

      const constructor = new ModuleConstructor([]);
      const module = constructor.construct(moduleDefinition);

      assertSerializableModuleIn({
        details,
        module,
      });
    });
  });

  describe("contractAtFromArtifact", () => {
    const fakeArtifact = ["FAKE ARTIFACT"] as any;

    it("should serialize a contractAt", () => {
      const moduleDefinition = defineModule("Module1", (m) => {
        const contract1 = m.contractAtFromArtifact(
          "Contract1",
          "0x0",
          fakeArtifact
        );

        return { contract1 };
      });

      const constructor = new ModuleConstructor([]);
      const module = constructor.construct(moduleDefinition);

      assertSerializableModuleIn({
        details,
        module,
      });
    });

    it("should serialize a contractAt with a future address", () => {
      const moduleDefinition = defineModule("Module1", (m) => {
        const contract1 = m.contractAtFromArtifact(
          "Contract1",
          "0x0",
          fakeArtifact
        );
        const call = m.staticCall(contract1, "getAddress");
        const contract2 = m.contractAtFromArtifact(
          "Contract2",
          call,
          fakeArtifact
        );

        return { contract1, contract2 };
      });

      const constructor = new ModuleConstructor([]);
      const module = constructor.construct(moduleDefinition);

      assertSerializableModuleIn({
        details,
        module,
      });
    });

    it("should serialize a contractAt with dependency", () => {
      const moduleDefinition = defineModule("Module1", (m) => {
        const contract1 = m.contractAtFromArtifact(
          "Contract1",
          "0x0",
          fakeArtifact
        );
        const contract2 = m.contractAtFromArtifact(
          "Contract2",
          "0x0",
          fakeArtifact,
          {
            after: [contract1],
          }
        );

        return { contract1, contract2 };
      });

      const constructor = new ModuleConstructor([]);
      const module = constructor.construct(moduleDefinition);

      assertSerializableModuleIn({
        details,
        module,
      });
    });
  });

  describe("library", () => {
    const fakeArtifact = ["FAKE ARTIFACT"] as any;

    it("should serialize a library deployment", () => {
      const moduleDefinition = defineModule("Module1", (m) => {
        const library1 = m.library("Library1");

        return { library1 };
      });

      const constructor = new ModuleConstructor([]);
      const module = constructor.construct(moduleDefinition);

      assertSerializableModuleIn({
        details,
        module,
      });
    });

    it("should serialize a library deployment with dependency", () => {
      const moduleDefinition = defineModule("Module1", (m) => {
        const library1 = m.library("Library1");
        const library2 = m.library("Library2", { after: [library1] });

        return {
          library1,
          library2,
        };
      });

      const constructor = new ModuleConstructor([]);
      const module = constructor.construct(moduleDefinition);

      assertSerializableModuleIn({
        details,
        module,
      });
    });

    it("should serialize a libraries passed in as libraries", () => {
      const moduleDefinition = defineModule("Module1", (m) => {
        const library1 = m.library("Library1");

        const contract2 = m.contract("Contract2", [], {
          libraries: {
            Lib1: library1,
          },
        });

        const contract3 = m.contractFromArtifact(
          "Contract3",
          fakeArtifact,
          [],
          {
            libraries: {
              Lib1: library1,
            },
          }
        );

        const library4 = m.library("Library4", {
          libraries: { Lib1: library1 },
        });

        const library5 = m.libraryFromArtifact("Library5", fakeArtifact, {
          libraries: { Lib1: library1 },
        });

        return {
          library1,
          contract2,
          contract3,
          library4,
          library5,
        };
      });

      const constructor = new ModuleConstructor([]);
      const module = constructor.construct(moduleDefinition);

      assertSerializableModuleIn({
        details,
        module,
      });
    });
  });

  describe("libraryFromArtifact", () => {
    const fakeArtifact = ["FAKE ARTIFACT"] as any;

    it("should serialize a libraryFromArtifact deployment", () => {
      const moduleDefinition = defineModule("Module1", (m) => {
        const library1 = m.libraryFromArtifact("Contract1", fakeArtifact);

        return { library1 };
      });

      const constructor = new ModuleConstructor([]);
      const module = constructor.construct(moduleDefinition);

      assertSerializableModuleIn({
        details,
        module,
      });
    });

    it("should serialize a libraryFromArtifact deployment with dependency", () => {
      const moduleDefinition = defineModule("Module1", (m) => {
        const library1 = m.libraryFromArtifact("Library1", fakeArtifact);

        const library2 = m.libraryFromArtifact("Library2", fakeArtifact, {
          after: [library1],
        });

        return { library1, library2 };
      });

      const constructor = new ModuleConstructor([]);
      const module = constructor.construct(moduleDefinition);

      assertSerializableModuleIn({
        details,
        module,
      });
    });
  });

  describe("call", () => {
    it("should serialize a call", () => {
      const moduleDefinition = defineModule("Module1", (m) => {
        const contract1 = m.contract("Contract1");

        m.call(contract1, "lock", [1, "a", false]);

        return { contract1 };
      });

      const constructor = new ModuleConstructor([]);
      const module = constructor.construct(moduleDefinition);

      assertSerializableModuleIn({
        details,
        module,
      });
    });

    it("should serialize a call with dependencies", () => {
      const moduleDefinition = defineModule("Module1", (m) => {
        const contract1 = m.contract("Contract1");
        const contract2 = m.contract("Contract2");

        m.call(contract2, "lock", [contract1]);
        m.call(contract2, "unlock", [], { after: [contract1] });

        return { contract1, contract2 };
      });

      const constructor = new ModuleConstructor([]);
      const module = constructor.construct(moduleDefinition);

      assertSerializableModuleIn({
        details,
        module,
      });
    });
  });

  describe("static call", () => {
    it("should serialize a call", () => {
      const moduleDefinition = defineModule("Module1", (m) => {
        const contract1 = m.contract("Contract1");

        m.staticCall(contract1, "lock", [1, "a", false]);

        return { contract1 };
      });

      const constructor = new ModuleConstructor([]);
      const module = constructor.construct(moduleDefinition);

      assertSerializableModuleIn({
        details,
        module,
      });
    });

    it("should serialize a static call with dependencies", () => {
      const moduleDefinition = defineModule("Module1", (m) => {
        const contract1 = m.contract("Contract1");
        const contract2 = m.contract("Contract2");

        m.staticCall(contract2, "lock", [contract1]);
        m.staticCall(contract2, "unlock", [], { after: [contract1] });

        return { contract1, contract2 };
      });

      const constructor = new ModuleConstructor([]);
      const module = constructor.construct(moduleDefinition);

      assertSerializableModuleIn({
        details,
        module,
      });
    });

    it("Should serialize readEventArgument", () => {
      const moduleDefinition = defineModule("Module1", (m) => {
        const contract1 = m.contract("Contract1");
        const emitter = m.contract("Emitter");

        m.readEventArgument(contract1, "EventName", "argumentName", {
          id: "customId",
          emitter,
          eventIndex: 123,
        });

        return { contract1 };
      });

      const constructor = new ModuleConstructor([]);
      const module = constructor.construct(moduleDefinition);

      assertSerializableModuleIn({
        details,
        module,
      });
    });
  });

  describe("useModule", () => {
    it("should serialize a deployment leveraging useModule", () => {
      const submodule = defineModule("Submodule", (m) => {
        const contract1 = m.contract("Contract1");

        return { contract1 };
      });

      const moduleDefinition = defineModule("Module", (m) => {
        const { contract1 } = m.useModule(submodule);

        return { contract1 };
      });

      const constructor = new ModuleConstructor([]);
      const module = constructor.construct(moduleDefinition);

      assertSerializableModuleIn({
        details,
        module,
      });
    });

    it("should serialize contract dependencies over the useModule barrier", () => {
      const submodule = defineModule("Submodule", (m) => {
        const contract1 = m.contract("Contract1");

        return { contract1 };
      });

      const moduleDefinition = defineModule("Module", (m) => {
        const { contract1 } = m.useModule(submodule);

        const contract2 = m.contract("Contract2", [contract1]);
        const contract3 = m.contract("Contract3", [], { after: [contract1] });

        return { contract1, contract2, contract3 };
      });

      const constructor = new ModuleConstructor([]);
      const module = constructor.construct(moduleDefinition);

      assertSerializableModuleIn({
        details,
        module,
      });
    });

    it("should serialize a diamond useModule", () => {
      const bottomModuleDefinition = defineModule("BottomModule", (m) => {
        const bottomContract = m.contract("Contract1");

        return { bottomContract };
      });

      const leftModuleDefinition = defineModule("LeftModule", (m) => {
        const { bottomContract } = m.useModule(bottomModuleDefinition);

        return { leftContract: bottomContract };
      });

      const rightModuleDefinition = defineModule("RightModule", (m) => {
        const { bottomContract } = m.useModule(bottomModuleDefinition);

        return { rightContract: bottomContract };
      });

      const moduleDefinition = defineModule("TopModule", (m) => {
        const { leftContract } = m.useModule(leftModuleDefinition);
        const { rightContract } = m.useModule(rightModuleDefinition);

        return { leftContract, rightContract };
      });

      const constructor = new ModuleConstructor([]);
      const module = constructor.construct(moduleDefinition);

      const deployment = {
        details,
        module,
      };

      assertSerializableModuleIn(deployment);

      const reserialized = StoredDeploymentDeserializer.deserialize(
        JSON.parse(
          JSON.stringify(
            StoredDeploymentSerializer.serialize(deployment),
            sortedKeysJsonStringifyReplacer
          )
        )
      );

      const lc = reserialized.module.results.leftContract;
      const rc = reserialized.module.results.rightContract;

      assert.equal(lc, rc);
    });
  });

  describe("Complex arguments serialization", () => {
    it("Should support futures as arguments", () => {
      const moduleDefinition = defineModule("Module", (m) => {
        const contract1 = m.contract("Contract1");
        const contract2 = m.contract("Contract2", [contract1]);

        return { contract1, contract2 };
      });

      const constructor = new ModuleConstructor(0, []);
      const module = constructor.construct(moduleDefinition);

      assertSerializableModuleIn({
        details,
        module,
      });
    });

    it("Should support bigint as arguments", () => {
      const moduleDefinition = defineModule("Module", (m) => {
        const contract1 = m.contract("Contract1", [1n]);

        return { contract1 };
      });

      const constructor = new ModuleConstructor(0, []);
      const module = constructor.construct(moduleDefinition);

      assertSerializableModuleIn({
        details,
        module,
      });
    });

    it("Should support complex arguments as arguments", () => {
      const moduleDefinition = defineModule("Module", (m) => {
        const contract1 = m.contract("Contract1", [
          1n,
          [1, 1n, "asd", { a: ["asd", false] }],
        ]);
        const contract2 = m.contract("Contract2", [
          { a: ["asd", false, { b: 1n, contract: contract1 }] },
        ]);

        return { contract1, contract2 };
      });

      const constructor = new ModuleConstructor(0, []);
      const module = constructor.construct(moduleDefinition);

      assertSerializableModuleIn({
        details,
        module,
      });
    });
  });
});

function assertSerializableModuleIn(deployment: StoredDeployment) {
  const serialized = JSON.stringify(
    StoredDeploymentSerializer.serialize(deployment),
    sortedKeysJsonStringifyReplacer,
    2
  );

  const reserialized = JSON.stringify(
    StoredDeploymentSerializer.serialize(
      StoredDeploymentDeserializer.deserialize(JSON.parse(serialized))
    ),
    sortedKeysJsonStringifyReplacer,
    2
  );

  assert.equal(
    serialized,
    reserialized,
    "Module not the same across serialization/deserialization"
  );

  // Invariants

  const ignitionModule = StoredDeploymentDeserializer.deserialize(
    JSON.parse(reserialized)
  ).module;

  assert(
    Object.values(ignitionModule.results).every((result) =>
      hasFutureInModuleOrSubmoduleOf(ignitionModule, result)
    ),
    "All results should be futures of the module or one of its submodules"
  );

  assert(
    allFuturesHaveModuleIn(ignitionModule),
    "All of the modules futures should have their parent module as the linked module"
  );

  // All constructor args have been swapped out
  assert(
    Array.from(ignitionModule.futures).every((future) => {
      if (future instanceof NamedContractDeploymentFutureImplementation) {
        return noFutureTokensIn(future.constructorArgs);
      }

      if (future instanceof ArtifactContractDeploymentFutureImplementation) {
        return noFutureTokensIn(future.constructorArgs);
      }

      return true;
    }),
    "All constructor args should have had their token futures swapped out for actual futures"
  );

  // All libraries have been swapped out
  assert(
    Array.from(ignitionModule.futures).every((future) => {
      if (future instanceof NamedContractDeploymentFutureImplementation) {
        return noFutureTokensInLibraries(future.libraries);
      }

      if (future instanceof ArtifactContractDeploymentFutureImplementation) {
        return noFutureTokensInLibraries(future.libraries);
      }

      if (future instanceof NamedLibraryDeploymentFutureImplementation) {
        return noFutureTokensInLibraries(future.libraries);
      }

      if (future instanceof ArtifactLibraryDeploymentFutureImplementation) {
        return noFutureTokensInLibraries(future.libraries);
      }

      return true;
    }),
    "All libraries should have had their token futures swapped out for actual futures"
  );

  // All dependencies have been swapped out
  assert(
    Array.from(ignitionModule.futures).every((future) => {
      return noFutureTokensIn(Array.from(future.dependencies));
    }),
    "All future dependencies should have had their token futures swapped out for actual futures"
  );
}

function noFutureTokensIn(list: any[]): boolean {
  return list.every((arg) => Boolean(arg) && arg._kind !== "FutureToken");
}

function noFutureTokensInLibraries(libs: { [key: string]: any }): boolean {
  return Object.values(libs).every(
    (arg) => Boolean(arg) && arg._kind !== "FutureToken"
  );
}

function hasFutureInModuleOrSubmoduleOf(
  ignitionModule: IgnitionModule<string, string, IgnitionModuleResult<string>>,
  future: ContractFuture<string>
): unknown {
  if (ignitionModule.futures.has(future)) {
    return true;
  }

  return Array.from(ignitionModule.submodules).some((submodule) =>
    hasFutureInModuleOrSubmoduleOf(submodule, future)
  );
}

function allFuturesHaveModuleIn(
  ignitionModule: IgnitionModule<string, string, IgnitionModuleResult<string>>
): boolean {
  if (
    Array.from(ignitionModule.futures).some(
      (future) =>
        future.module.id === "PLACEHOLDER" && future.module !== ignitionModule
    )
  ) {
    return false;
  }

  return Array.from(ignitionModule.submodules).every((submodule) =>
    allFuturesHaveModuleIn(submodule)
  );
}

function sortedKeysJsonStringifyReplacer(_key: string, value: any) {
  if (!(value instanceof Object) || Array.isArray(value)) {
    return value;
  }
  const sorted = {} as any;
  for (const key of Object.keys(value).sort()) {
    sorted[key] = value[key];
  }

  return sorted;
}
