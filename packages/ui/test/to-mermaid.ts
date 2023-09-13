import { Artifact, IgnitionModule, buildModule } from "@ignored/ignition-core";
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

      Module:::startModule

        subgraph Module
          direction BT

          Module#Contract1["Deploy Contract1"]
        end

      classDef startModule stroke-width:4px`;

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

      Test_registrar:::startModule

        subgraph Test_registrar
          direction BT

          Test_registrar#Contract1["Deploy Contract1"]
        end

      classDef startModule stroke-width:4px`;

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

      Module:::startModule

        subgraph Module
          direction BT

          Module#Contract3["Deploy Contract3"]
        end
        subgraph Submodule1
          direction BT

          Submodule1#Contract1["Deploy Contract1"]
        end
        subgraph Submodule2
          direction BT

          Submodule2#Contract2["Deploy Contract2"]
        end

      Module#Contract3 --> Submodule1#Contract1
      Module#Contract3 --> Submodule2#Contract2

      Module -.-> Submodule1
      Module -.-> Submodule2

      classDef startModule stroke-width:4px`;

    assertDiagram(moduleDefinition, expectedResult);
  });

  it("should render a complex diagram with all actions", () => {
    const fakeArtifact: Artifact = {
      abi: [],
      contractName: "",
      bytecode: "",
      linkReferences: {},
    };

    const libArtifact = fakeArtifact;
    const withLibArtifact = fakeArtifact;

    const moduleDefinition = buildModule("Module", (m) => {
      const basic = m.contract("BasicContract");
      const library = m.library("BasicLibrary");
      const libFromArtifact = m.libraryFromArtifact(
        "BasicLibrary",
        libArtifact,
        {
          id: "BasicLibrary2",
        }
      );
      const withLib = m.contractFromArtifact(
        "ContractWithLibrary",
        withLibArtifact,
        [],
        {
          libraries: { BasicLibrary: library },
        }
      );

      const call = m.call(basic, "basicFunction", [40]);
      const eventArg = m.readEventArgument(call, "BasicEvent", "eventArg");
      m.staticCall(withLib, "readonlyFunction", [eventArg]);

      const duplicate = m.contractAt("BasicContract", basic, {
        id: "BasicContract2",
      });
      const duplicateWithLib = m.contractAtFromArtifact(
        "ContractWithLibrary",
        withLib,
        withLibArtifact,
        { id: "ContractWithLibrary2" }
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

      Module:::startModule

        subgraph Module
          direction BT

          Module#BasicContract["Deploy BasicContract"]
          Module#BasicLibrary["Deploy library BasicLibrary"]
          Module#BasicLibrary2["Deploy library from artifact BasicLibrary"]
          Module#ContractWithLibrary["Deploy from artifact ContractWithLibrary"]
          Module#BasicContract.basicFunction["Call BasicContract/basicFunction"]
          Module#BasicContract.BasicEvent.eventArg.0["Read event from future Module#BasicContract.basicFunction (event BasicEvent argument eventArg)"]
          Module#ContractWithLibrary.readonlyFunction["Static call ContractWithLibrary/readonlyFunction"]
          Module#BasicContract2["Existing contract BasicContract (Module#BasicContract)"]
          Module#ContractWithLibrary2["Existing contract from artifact ContractWithLibrary (Module#ContractWithLibrary)"]
          Module#test_send["Send data to Module#BasicContract2"]
        end

      Module#ContractWithLibrary --> Module#BasicLibrary
      Module#BasicContract.basicFunction --> Module#BasicContract
      Module#BasicContract.BasicEvent.eventArg.0 --> Module#BasicContract.basicFunction
      Module#ContractWithLibrary.readonlyFunction --> Module#ContractWithLibrary
      Module#ContractWithLibrary.readonlyFunction --> Module#BasicContract.BasicEvent.eventArg.0
      Module#BasicContract2 --> Module#BasicContract
      Module#ContractWithLibrary2 --> Module#ContractWithLibrary
      Module#test_send --> Module#BasicContract2

      classDef startModule stroke-width:4px`;

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

      Module:::startModule

        subgraph Module
          direction BT

          Module#ens["Deploy ens"]
          Module#ens.setAddr_bytes32_address_["Call ens/setAddr(bytes32,address)"]
          Module#ens.getAddr_bytes32_address_["Static call ens/getAddr(bytes32,address)"]
        end

      Module#ens.setAddr_bytes32_address_ --> Module#ens
      Module#ens.getAddr_bytes32_address_ --> Module#ens

      classDef startModule stroke-width:4px`;

    assertDiagram(moduleDefinition, expectedResult);
  });
});

function assertDiagram(ignitionModule: IgnitionModule, expectedResult: string) {
  const details = {
    networkName: "hardhat",
    chainId: 31117,
  };

  const result = toMermaid({
    details,
    module: ignitionModule,
  });

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
