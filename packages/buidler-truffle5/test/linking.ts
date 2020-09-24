import { HARDHAT_NETWORK_NAME } from "@nomiclabs/buidler/plugins";
import { assert } from "chai";
import path from "path";

import { useEnvironment } from "./helpers";

function linkingShouldWorkCorrectly() {
  describe("Linking with an instance", function () {
    it("Should link correctly", async function () {
      const Lib = this.env.artifacts.require("Lib");
      const UsesLib = this.env.artifacts.require("UsesLib");
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
      const Lib = this.env.artifacts.require("Lib");
      const UsesLib = this.env.artifacts.require("UsesLib");
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
      const Lib = this.env.artifacts.require("Lib");
      const UsesLib = this.env.artifacts.require("UsesLib");
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
      const UsesLib = this.env.artifacts.require("UsesLib");

      assert.throws(
        () => UsesLib.link("Lib", "0x1111111111111111111111111111111111111111"),
        "Linking contracts by name is not supported by Buidler. Please use UsesLib.link(libraryInstance) instead."
      );
    });
  });

  describe("Linking with a map from name to address", function () {
    it("Should throw the right error", async function () {
      const UsesLib = this.env.artifacts.require("UsesLib");

      assert.throws(
        () =>
          UsesLib.link({ Lib: "0x1111111111111111111111111111111111111111" }),
        "Linking contracts with a map of addresses is not supported by Buidler. Please use UsesLib.link(libraryInstance) instead"
      );
    });
  });

  describe("Linking a library more than once", function () {
    it("Should throw the right error", async function () {
      const Lib = this.env.artifacts.require("Lib");
      const UsesLib = this.env.artifacts.require("UsesLib");
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
      const Lib = this.env.artifacts.require("Lib");
      const Greeter = this.env.artifacts.require("Greeter");
      const lib = await Lib.new();

      assert.throws(
        () => Greeter.link(lib),
        "Tried to link contract Greeter with library Lib, but it uses no libraries."
      );
    });
  });

  describe("Linking an incorrect library", function () {
    it("Should throw the right error", async function () {
      const UsesLib = this.env.artifacts.require("UsesLib");
      const Greeter = this.env.artifacts.require("Greeter");

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
    useEnvironment(
      path.join(__dirname, "hardhat-project-solc-0.4"),
      HARDHAT_NETWORK_NAME
    );
    linkingShouldWorkCorrectly();
  });

  describe("When using solc 0.5.x", function () {
    useEnvironment(
      path.join(__dirname, "hardhat-project-solc-0.5"),
      HARDHAT_NETWORK_NAME
    );
    linkingShouldWorkCorrectly();
  });

  describe("When using solc 0.6.x", function () {
    useEnvironment(
      path.join(__dirname, "hardhat-project-solc-0.6"),
      HARDHAT_NETWORK_NAME
    );
    linkingShouldWorkCorrectly();
  });
});
