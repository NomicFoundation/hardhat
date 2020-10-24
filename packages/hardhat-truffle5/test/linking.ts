import { assert } from "chai";
import { HARDHAT_NETWORK_NAME } from "hardhat/plugins";

import { useEnvironment } from "./helpers";

function linkingShouldWorkCorrectly(isAmbiguous = false) {
  const greeterName = isAmbiguous ? "contracts/Greeter.sol:Greeter" : "Greeter";
  const libName = isAmbiguous ? "contracts/Greeter.sol:Lib" : "Lib";
  const usesLibName = isAmbiguous ? "contracts/Greeter.sol:UsesLib" : "UsesLib";

  describe("Linking with an instance", function () {
    it("Should link correctly", async function () {
      const Lib = this.env.artifacts.require(libName);
      const UsesLib = this.env.artifacts.require(usesLibName);
      const lib = await Lib.new();

      UsesLib.link(lib);

      const usesLib = await UsesLib.new();
      assert.strictEqual((await usesLib.n()).toString(10), "0");

      await usesLib.addTwo();
      assert.strictEqual((await usesLib.n()).toString(10), "2");
    });
  });

  describe("Linking with an instance created with .at", function () {
    it("Should link correctly", async function () {
      const Lib = this.env.artifacts.require(libName);
      const UsesLib = this.env.artifacts.require(usesLibName);
      const lib = await Lib.new();

      const lib2 = await Lib.at(lib.address);

      UsesLib.link(lib2);

      const usesLib = await UsesLib.new();
      assert.strictEqual((await usesLib.n()).toString(10), "0");

      await usesLib.addTwo();
      assert.strictEqual((await usesLib.n()).toString(10), "2");
    });
  });

  describe("Linking with an instance created with new", function () {
    it("Should link correctly", async function () {
      const Lib = this.env.artifacts.require(libName);
      const UsesLib = this.env.artifacts.require(usesLibName);
      const lib = await Lib.new();

      const lib2 = new Lib(lib.address);

      UsesLib.link(lib2);

      const usesLib = await UsesLib.new();
      assert.strictEqual((await usesLib.n()).toString(10), "0");

      await usesLib.addTwo();
      assert.strictEqual((await usesLib.n()).toString(10), "2");
    });
  });

  describe("Linking with name and address", function () {
    it("Should throw the right error", async function () {
      const UsesLib = this.env.artifacts.require(usesLibName);

      assert.throws(
        () =>
          UsesLib.link(libName, "0x1111111111111111111111111111111111111111"),
        "Linking contracts by name is not supported by Hardhat. Please use UsesLib.link(libraryInstance) instead."
      );
    });
  });

  describe("Linking with a map from name to address", function () {
    it("Should throw the right error", async function () {
      const UsesLib = this.env.artifacts.require(usesLibName);

      assert.throws(
        () =>
          UsesLib.link({ Lib: "0x1111111111111111111111111111111111111111" }),
        "Linking contracts with a map of addresses is not supported by Hardhat. Please use UsesLib.link(libraryInstance) instead"
      );
    });
  });

  describe("Linking a library more than once", function () {
    it("Should throw the right error", async function () {
      const Lib = this.env.artifacts.require(libName);
      const UsesLib = this.env.artifacts.require(usesLibName);
      const lib = await Lib.new();
      const lib2 = await Lib.new();

      UsesLib.link(lib);
      assert.throws(
        () => UsesLib.link(lib2),
        "Contract UsesLib has already been linked to Lib."
      );
    });
  });

  describe("Linking when not necessary", function () {
    it("Should throw the right error", async function () {
      const Lib = this.env.artifacts.require(libName);
      const Greeter = this.env.artifacts.require(greeterName);
      const lib = await Lib.new();

      assert.throws(
        () => Greeter.link(lib),
        "Tried to link contract Greeter with library Lib, but it uses no libraries."
      );
    });
  });

  describe("Linking an incorrect library", function () {
    it("Should throw the right error", async function () {
      const UsesLib = this.env.artifacts.require(usesLibName);
      const Greeter = this.env.artifacts.require(greeterName);

      const greeter = await Greeter.new();

      assert.throws(
        () => UsesLib.link(greeter),
        "Tried to link contract UsesLib with library Greeter, but it's not one of its libraries. UsesLib's libraries are: Lib"
      );
    });
  });
}

describe("Libraries linking", function () {
  describe("When using solc 0.4.x", function () {
    useEnvironment("hardhat-project-solc-0.4", HARDHAT_NETWORK_NAME);
    linkingShouldWorkCorrectly();
  });

  describe("When using solc 0.5.x", function () {
    useEnvironment("hardhat-project-solc-0.5", HARDHAT_NETWORK_NAME);
    linkingShouldWorkCorrectly();
  });

  describe("When using solc 0.6.x", function () {
    useEnvironment("hardhat-project-solc-0.6", HARDHAT_NETWORK_NAME);
    linkingShouldWorkCorrectly();
  });

  describe("When the contract and the library have ambiguous names", function () {
    useEnvironment("hardhat-project-ambiguous-names", HARDHAT_NETWORK_NAME);
    linkingShouldWorkCorrectly(true);
  });
});
