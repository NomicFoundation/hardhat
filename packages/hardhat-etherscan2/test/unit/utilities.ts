import { assert, expect } from "chai";
import path from "path";
import {
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
});
