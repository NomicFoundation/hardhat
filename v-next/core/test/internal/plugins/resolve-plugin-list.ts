import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolvePluginList } from "../../../src/internal/plugins/resolve-plugin-list.js";
import { HardhatPlugin } from "../../../src/types/plugins.js";

describe("Plugins - resolve plugin list", () => {
  const installedPackageFixture = import.meta.resolve(
    "./fixture-projects/installed-package",
  );

  it("should return empty on an empty plugin list", async () => {
    assert.deepStrictEqual(
      await resolvePluginList([], installedPackageFixture),
      [],
    );
  });

  it("should return empty on an undefined plugin list", async () => {
    assert.deepStrictEqual(
      await resolvePluginList(undefined, installedPackageFixture),
      [],
    );
  });

  it("should return a single plugin", async () => {
    const plugin: HardhatPlugin = {
      id: "example-plugin",
    };

    assert.deepStrictEqual(
      await resolvePluginList([plugin], installedPackageFixture),
      [plugin],
    );
  });

  it("should support nested dependencies", async () => {
    // A -> B -> C
    const c: HardhatPlugin = { id: "c" };
    const b: HardhatPlugin = { id: "b", dependencies: [async () => c] };
    const a: HardhatPlugin = { id: "a", dependencies: [async () => b] };

    assert.deepStrictEqual(
      await resolvePluginList([a], installedPackageFixture),
      [c, b, a],
    );
  });

  it("should break ties by honouring array order", async () => {
    // A / B / C
    const c: HardhatPlugin = { id: "c" };
    const b: HardhatPlugin = { id: "b" };
    const a: HardhatPlugin = { id: "a" };

    assert.deepStrictEqual(
      await resolvePluginList([a, b, c], installedPackageFixture),
      [a, b, c],
    );
  });

  it("should break ties by honouring subdependency array order", async () => {
    //   A
    //  / \
    // B   C
    const c: HardhatPlugin = { id: "c" };
    const b: HardhatPlugin = { id: "b" };
    const a: HardhatPlugin = {
      id: "a",
      dependencies: [async () => b, async () => c],
    };

    assert.deepStrictEqual(
      await resolvePluginList([a], installedPackageFixture),
      [b, c, a],
    );
  });

  it("should support shared dependencies", async () => {
    // A   B
    //  \ /
    //   C
    const c: HardhatPlugin = { id: "c" };
    const b: HardhatPlugin = { id: "b", dependencies: [async () => c] };
    const a: HardhatPlugin = { id: "a", dependencies: [async () => c] };

    assert.deepStrictEqual(
      await resolvePluginList([a, b], installedPackageFixture),
      [c, a, b],
    );
  });

  it("should support shared subdependencies", async () => {
    //   A
    //  / \
    // B   C
    //  \ /
    //   D
    const d: HardhatPlugin = { id: "d" };
    const c: HardhatPlugin = { id: "c", dependencies: [async () => d] };
    const b: HardhatPlugin = { id: "b", dependencies: [async () => d] };
    const a: HardhatPlugin = {
      id: "a",
      dependencies: [async () => b, async () => c],
    };

    assert.deepStrictEqual(
      await resolvePluginList([a], installedPackageFixture),
      [d, b, c, a],
    );
  });

  it("should deal with a complicated dependency graph", async () => {
    //   A    B
    //  / \  / \ \
    // C   D    E F
    //  \ /     \/
    //   G      H
    //    \    /
    //      I
    const i: HardhatPlugin = { id: "i" };
    const h: HardhatPlugin = { id: "h", dependencies: [async () => i] };
    const g: HardhatPlugin = { id: "g", dependencies: [async () => i] };
    const f: HardhatPlugin = { id: "f", dependencies: [async () => h] };
    const e: HardhatPlugin = { id: "e", dependencies: [async () => h] };
    const d: HardhatPlugin = { id: "d", dependencies: [async () => g] };
    const c: HardhatPlugin = { id: "c", dependencies: [async () => g] };
    const b: HardhatPlugin = {
      id: "b",
      dependencies: [async () => d, async () => e, async () => f],
    };
    const a: HardhatPlugin = {
      id: "a",
      dependencies: [async () => c, async () => d],
    };

    assert.deepStrictEqual(
      await resolvePluginList([a, b], installedPackageFixture),
      [i, g, c, d, a, h, e, f, b],
    );
  });

  it("should throw a HardhatError on finding different plugins with the same id", async () => {
    const a = { id: "dup" };
    const copy = { id: "dup" };

    await assert.rejects(
      async () => resolvePluginList([a, copy], installedPackageFixture),
      {
        name: "HardhatError",
        message:
          'HHE4: Duplicated plugin id "dup" found. Did you install multiple versions of the same plugin?',
      },
    );
  });

  describe("dependency loading errors", () => {
    it("should throw a general HardhatError on a dependency loading failing for unknown reasons", async () => {
      const plugin: HardhatPlugin = {
        id: "plugin",
        npmPackage: "example",
        dependencies: [
          async () => {
            throw new Error("Unknown reaons");
          },
        ],
      };

      await assert.rejects(
        async () => resolvePluginList([plugin], installedPackageFixture),
        {
          name: "HardhatError",
          message: 'HHE1203: Plugin "plugin" dependency could not be loaded.',
        },
      );
    });

    it("should throw a plugin installation validation error if there is a dependency load failure", async () => {
      const notInstalledPackageFixture = import.meta.resolve(
        "./fixture-projects/not-installed-package",
      );

      const plugin: HardhatPlugin = {
        id: "example",
        npmPackage: "example",
        dependencies: [
          async () => {
            throw new Error("Not installed");
          },
        ],
      };

      await assert.rejects(
        async () => resolvePluginList([plugin], notInstalledPackageFixture),
        {
          name: "HardhatError",
          message: 'HHE1200: Plugin "example" is not installed.',
        },
      );
    });
  });
});
