import {
  type Artifact,
  type IgnitionModule,
  buildModule,
} from "@ignored/hardhat-vnext-ignition-core";
import { assert } from "chai";

import { toMermaid } from "../src/utils/to-mermaid.js";

describe("to-mermaid", () => {
  it("should render a single deploy contract diagram", () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const p = m.getParameter("p", 123);
      const contract1 = m.contract("Contract1", [{ arr: [p] }]);

      return { contract1 };
    });

    const expectedResult = testFormat`
      flowchart BT

      Module

        subgraph Module[ ]
         direction BT

          subgraph ModulePadding["[ Module ]"]
          direction BT

          subgraph ModuleInner[ ]
          direction BT

          Module______Contract1["Deploy Contract1"]:::futureNode
        end

      style ModuleInner fill:none,stroke:none
        end

      style ModulePadding fill:none,stroke:none
        end

      style Module fill:#fbfbfb,stroke:#e5e6e7`;

    assertDiagram(moduleDefinition, expectedResult);
  });

  it("should render a module with a space in the name", () => {
    const moduleDefinition = buildModule("Test_registrar", (m) => {
      const p = m.getParameter("p", 123);
      const contract1 = m.contract("Contract1", [{ arr: [p] }]);

      return { contract1 };
    });

    const expectedResult = testFormat`
      flowchart BT

      Test_registrar

        subgraph Test_registrar[ ]
         direction BT

          subgraph Test_registrarPadding["[ Test_registrar ]"]
          direction BT

          subgraph Test_registrarInner[ ]
          direction BT

          Test_registrar______Contract1["Deploy Contract1"]:::futureNode
        end

      style Test_registrarInner fill:none,stroke:none
        end

      style Test_registrarPadding fill:none,stroke:none
        end

      style Test_registrar fill:#fbfbfb,stroke:#e5e6e7`;

    assertDiagram(moduleDefinition, expectedResult);
  });

  it("should render a multi-module deploy diagram", () => {
    const sub1 = buildModule("Submodule1", (m) => {
      const contract1 = m.contract("Contract1", []);

      return { contract1 };
    });

    const sub2 = buildModule("Submodule2", (m) => {
      const contract2 = m.contract("Contract2", []);

      return { contract2 };
    });

    const moduleDefinition = buildModule("Module", (m) => {
      const { contract1 } = m.useModule(sub1);
      const { contract2 } = m.useModule(sub2);

      const contract3 = m.contract("Contract3", [], {
        after: [contract1, contract2],
      });

      return { contract3 };
    });

    const expectedResult = testFormat`
      flowchart BT

      Module

        subgraph Module[ ]
         direction BT

          subgraph ModulePadding["[ Module ]"]
          direction BT

          subgraph ModuleInner[ ]
          direction BT

          Module______Contract3["Deploy Contract3"]:::futureNode
        end

      style ModuleInner fill:none,stroke:none
        end

      style ModulePadding fill:none,stroke:none
        end

      style Module fill:#fbfbfb,stroke:#e5e6e7
        subgraph Submodule1[ ]
         direction BT

          subgraph Submodule1Padding["[ Submodule1 ]"]
          direction BT

          subgraph Submodule1Inner[ ]
          direction BT

          Submodule1______Contract1["Deploy Contract1"]:::futureNode
        end

      style Submodule1Inner fill:none,stroke:none
        end

      style Submodule1Padding fill:none,stroke:none
        end

      style Submodule1 fill:#fbfbfb,stroke:#e5e6e7
        subgraph Submodule2[ ]
         direction BT

          subgraph Submodule2Padding["[ Submodule2 ]"]
          direction BT

          subgraph Submodule2Inner[ ]
          direction BT

          Submodule2______Contract2["Deploy Contract2"]:::futureNode
        end

      style Submodule2Inner fill:none,stroke:none
        end

      style Submodule2Padding fill:none,stroke:none
        end

      style Submodule2 fill:#fbfbfb,stroke:#e5e6e7

      Module______Contract3 --> Submodule1______Contract1
      Module______Contract3 --> Submodule2______Contract2

      Module -.-> Submodule1
      Module -.-> Submodule2`;

    assertDiagram(moduleDefinition, expectedResult);
  });

  it("should render a complex diagram with all actions", () => {
    const fakeArtifact: Artifact = {
      _format: "hh3-artifact-1",
      abi: [],
      contractName: "",
      sourceName: "",
      bytecode: "",
      deployedBytecode: "",
      linkReferences: {},
      deployedLinkReferences: {},
    };

    const libArtifact = fakeArtifact;
    const withLibArtifact = fakeArtifact;

    const moduleDefinition = buildModule("Module", (m) => {
      const basic = m.contract("BasicContract");
      const library = m.library("BasicLibrary");
      const libFromArtifact = m.library("BasicLibrary", libArtifact, {
        id: "BasicLibrary2",
      });
      const withLib = m.contract("ContractWithLibrary", withLibArtifact, [], {
        libraries: { BasicLibrary: library },
      });

      const call = m.call(basic, "basicFunction", [40]);
      const eventArg = m.readEventArgument(call, "BasicEvent", "eventArg");
      m.staticCall(withLib, "readonlyFunction", [eventArg]);

      const duplicate = m.contractAt("BasicContract", basic, {
        id: "BasicContract2",
      });
      const duplicateWithLib = m.contractAt(
        "ContractWithLibrary",
        withLibArtifact,
        withLib,
        { id: "ContractWithLibrary2" },
      );

      m.send("test_send", duplicate, 123n);

      return {
        basic,
        library,
        libFromArtifact,
        withLib,
        duplicate,
        duplicateWithLib,
      };
    });

    const expectedResult = testFormat`
      flowchart BT

      Module

        subgraph Module[ ]
         direction BT

          subgraph ModulePadding["[ Module ]"]
          direction BT

          subgraph ModuleInner[ ]
          direction BT

          Module______BasicContract["Deploy BasicContract"]:::futureNode
          Module______BasicLibrary["Deploy library BasicLibrary"]:::futureNode
          Module______BasicLibrary2["Deploy library from artifact BasicLibrary"]:::futureNode
          Module______ContractWithLibrary["Deploy from artifact ContractWithLibrary"]:::futureNode
          Module______BasicContract.basicFunction["Call BasicContract.basicFunction"]:::futureNode
          Module______BasicContract.BasicEvent.eventArg.0["Read event from future Module#BasicContract.basicFunction (event BasicEvent argument eventArg)"]:::futureNode
          Module______ContractWithLibrary.readonlyFunction["Static call ContractWithLibrary.readonlyFunction"]:::futureNode
          Module______BasicContract2["Existing contract BasicContract (Module#BasicContract)"]:::futureNode
          Module______ContractWithLibrary2["Existing contract from artifact ContractWithLibrary (Module#ContractWithLibrary)"]:::futureNode
          Module______test_send["Send data to Module#BasicContract2"]:::futureNode
        end

      style ModuleInner fill:none,stroke:none
        end

      style ModulePadding fill:none,stroke:none
        end

      style Module fill:#fbfbfb,stroke:#e5e6e7

      Module______ContractWithLibrary --> Module______BasicLibrary
      Module______BasicContract.basicFunction --> Module______BasicContract
      Module______BasicContract.BasicEvent.eventArg.0 --> Module______BasicContract.basicFunction
      Module______ContractWithLibrary.readonlyFunction --> Module______ContractWithLibrary
      Module______ContractWithLibrary.readonlyFunction --> Module______BasicContract.BasicEvent.eventArg.0
      Module______BasicContract2 --> Module______BasicContract
      Module______ContractWithLibrary2 --> Module______ContractWithLibrary
      Module______test_send --> Module______BasicContract2`;

    assertDiagram(moduleDefinition, expectedResult);
  });

  it("should render calls with args", () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const resolver = m.contract("ens", []);

      m.call(resolver, "setAddr(bytes32,address)", [123, "0x0123"]);
      m.staticCall(resolver, "getAddr(bytes32,address)", [123, "0x0123"]);

      return { resolver };
    });

    const expectedResult = testFormat`
      flowchart BT

      Module

        subgraph Module[ ]
         direction BT

          subgraph ModulePadding["[ Module ]"]
          direction BT

          subgraph ModuleInner[ ]
          direction BT

          Module______ens["Deploy ens"]:::futureNode
          Module______ens.setAddr__bytes32____address___["Call ens.setAddr(bytes32,address)"]:::futureNode
          Module______ens.getAddr__bytes32____address___["Static call ens.getAddr(bytes32,address)"]:::futureNode
        end

      style ModuleInner fill:none,stroke:none
        end

      style ModulePadding fill:none,stroke:none
        end

      style Module fill:#fbfbfb,stroke:#e5e6e7

      Module______ens.setAddr__bytes32____address___ --> Module______ens
      Module______ens.getAddr__bytes32____address___ --> Module______ens`;

    assertDiagram(moduleDefinition, expectedResult);
  });
});

function assertDiagram(ignitionModule: IgnitionModule, expectedResult: string) {
  const result = toMermaid(ignitionModule);

  assert.equal(result, expectedResult);
}

function testFormat(expected: TemplateStringsArray): string {
  return expected
    .toString()
    .substring(1)
    .split("\n")
    .map((line) => line.substring(6))
    .join("\n");
}
