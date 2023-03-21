import { assert, expect } from "chai";
import path from "path";
import { SolidityConfig } from "hardhat/types";
import {
  getCompilerVersions,
  isFullyQualifiedName,
  resolveConstructorArguments,
  resolveLibraries,
} from "../../src/utilities";

describe("Utilities", () => {
  describe("isFullyQualifiedName", () => {
    it("should return true if the contract name is fully qualified", () => {
      assert(isFullyQualifiedName("path/to/contract.sol:Contract"));
      assert(isFullyQualifiedName("path-to-contract-sol:Contract"));
      assert(isFullyQualifiedName("a:b"));
      assert(!isFullyQualifiedName("path/to:contract.sol:Contract"));
      assert(!isFullyQualifiedName(":path/to/contract.sol:Contract"));
      assert(!isFullyQualifiedName("path/to/contract.sol:Contract:"));
      assert(!isFullyQualifiedName("path/to/contract.solContract"));
      assert(!isFullyQualifiedName("path/to/contract.sol:"));
      assert(!isFullyQualifiedName(":Contract"));
      assert(!isFullyQualifiedName(":"));
    });
  });

  describe("resolveConstructorArguments", () => {
    it("should return the constructorArgsParams if constructorArgsModule is not defined", async () => {
      const constructorArgsParams = ["1", "arg2", "false"];
      const result = await resolveConstructorArguments(constructorArgsParams);

      assert.equal(constructorArgsParams, result);
    });

    it("should return the constructor arguments exported in constructorArgsModule", async () => {
      const constructorArgsParams = ["1", "arg2", "false"];
      const constructorArgsModule = "test/unit/mocks/valid-constructor-args.js";
      const expected = [
        50,
        "a string argument",
        {
          x: 10,
          y: 5,
        },
        "0xabcdef",
      ];
      let result = await resolveConstructorArguments(
        constructorArgsParams,
        constructorArgsModule
      );

      assert.deepEqual(result, expected);

      result = await resolveConstructorArguments([], constructorArgsModule);

      assert.deepEqual(result, expected);
    });

    it("should throw if constructorArgsModule can't be imported", async () => {
      await expect(
        resolveConstructorArguments([], "not-a-valid-path.js")
      ).to.be.rejectedWith(/Cannot find module/);
    });

    it("should throw if the constructor arguments exported in constructorArgsModule are not an array", async () => {
      const constructorArgsModule =
        "test/unit/mocks/invalid-constructor-args.js";
      const constructorArgsModulePath = path.resolve(
        process.cwd(),
        constructorArgsModule
      );
      await expect(
        resolveConstructorArguments([], constructorArgsModule)
      ).to.be.rejectedWith(
        new RegExp(
          `The module ${constructorArgsModulePath} doesn't export a list.`
        )
      );
    });
  });

  describe("resolveLibraries", () => {
    it("should return an empty object if librariesModule is not defined", async () => {
      const result = await resolveLibraries();

      assert.deepEqual(result, {});
    });

    it("should return the library dictionary exported in librariesModule", async () => {
      const librariesModule = "test/unit/mocks/valid-libraries.js";
      const expected = {
        SomeLibrary: "0x...",
        AnotherLibrary: "0x...",
      };

      const result = await resolveLibraries(librariesModule);

      assert.deepEqual(result, expected);
    });

    it("should throw if librariesModule can't be imported", async () => {
      await expect(resolveLibraries("not-a-valid-path.js")).to.be.rejectedWith(
        /Cannot find module/
      );
    });

    it("should throw if the libraries exported in librariesModule are not a dictionary", async () => {
      const librariesModule = "test/unit/mocks/invalid-libraries.js";
      const librariesModulePath = path.resolve(process.cwd(), librariesModule);
      await expect(resolveLibraries(librariesModule)).to.be.rejectedWith(
        new RegExp(
          `The module ${librariesModulePath} doesn't export a dictionary.`
        )
      );
    });
  });

  describe("getCompilerVersions", () => {
    it("should return the list of compiler versions defined in the hardhat config (compilers + overrides)", async () => {
      const solidityConfig: SolidityConfig = {
        compilers: [
          {
            version: "0.8.18",
            settings: {},
          },
          {
            version: "0.7.2",
            settings: {},
          },
        ],
        overrides: {
          "contracts/Foo.sol": {
            version: "0.5.5",
            settings: {},
          },
          "contracts/Bar.sol": {
            version: "0.6.4",
            settings: {},
          },
        },
      };
      const expected = ["0.8.18", "0.7.2", "0.5.5", "0.6.4"];
      const compilerVersions = await getCompilerVersions(solidityConfig);
      assert.deepEqual(compilerVersions, expected);
    });

    it("should return the list of compiler versions defined in the hardhat config (compilers - no overrides)", async () => {
      const solidityConfig = {
        compilers: [
          {
            version: "0.8.18",
            settings: {},
          },
          {
            version: "0.7.2",
            settings: {},
          },
          {
            version: "0.4.11",
            settings: {},
          },
        ],
        overrides: {},
      };
      const expected = ["0.8.18", "0.7.2", "0.4.11"];
      const compilerVersions = await getCompilerVersions(solidityConfig);
      assert.deepEqual(compilerVersions, expected);
    });

    it("should return the list of compiler versions defined in the hardhat config (compilers + overrides (dup))", async () => {
      const solidityConfig = {
        compilers: [
          {
            version: "0.8.18",
            settings: {},
          },
        ],
        overrides: {
          "contracts/Foo.sol": {
            version: "0.8.18",
            settings: {},
          },
        },
      };
      const expected = ["0.8.18", "0.8.18"];
      const compilerVersions = await getCompilerVersions(solidityConfig);
      assert.deepEqual(compilerVersions, expected);
    });

    it("should throw if any version is below Etherscan supported version (compilers)", async () => {
      const solidityConfig = {
        compilers: [
          {
            version: "0.8.18",
            settings: {},
          },
          {
            version: "0.4.10",
            settings: {},
          },
        ],
        overrides: {
          "contracts/Foo.sol": {
            version: "0.8.15",
            settings: {},
          },
        },
      };

      await expect(getCompilerVersions(solidityConfig)).to.be.rejectedWith(
        /Etherscan only supports compiler versions 0.4.11 and higher/
      );
    });

    it("should throw if any version is below Etherscan supported version (overrides)", async () => {
      const solidityConfig = {
        compilers: [
          {
            version: "0.8.18",
            settings: {},
          },
          {
            version: "0.7.6",
            settings: {},
          },
        ],
        overrides: {
          "contracts/Foo.sol": {
            version: "0.3.5",
            settings: {},
          },
        },
      };

      await expect(getCompilerVersions(solidityConfig)).to.be.rejectedWith(
        /Etherscan only supports compiler versions 0.4.11 and higher/
      );
    });
  });
});
