import type { HardhatPlugin } from "../../../../src/types/plugins.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { resolvePluginList } from "../../../../src/internal/core/plugins/resolve-plugin-list.js";

describe("Plugins - resolve plugin list", () => {
  const installedPackageFixture = import.meta.resolve(
    "./fixture-projects/installed-package",
  );

  it("should return empty on an empty plugin list", async () => {
    assert.deepEqual(await resolvePluginList(installedPackageFixture, []), []);
  });

  it("should return empty on an undefined plugin list", async () => {
    assert.deepEqual(
      await resolvePluginList(installedPackageFixture, undefined),
      [],
    );
  });

  it("should return a single plugin", async () => {
    const plugin: HardhatPlugin = {
      id: "example-plugin",
    };

    assert.deepEqual(
      await resolvePluginList(installedPackageFixture, [plugin]),
      [plugin],
    );
  });

  it("should support nested dependencies", async () => {
    // A -> B -> C
    const c: HardhatPlugin = { id: "c" };
    const b: HardhatPlugin = {
      id: "b",
      dependencies: () => [Promise.resolve({ default: c })],
    };
    const a: HardhatPlugin = {
      id: "a",
      dependencies: () => [Promise.resolve({ default: b })],
    };

    const expected = [c, b, a];
    assert.deepEqual(
      await resolvePluginList(installedPackageFixture, [a]),
      expected,
    );
  });

  it("should break ties by honouring array order", async () => {
    // A / B / C
    const c: HardhatPlugin = { id: "c" };
    const b: HardhatPlugin = { id: "b" };
    const a: HardhatPlugin = { id: "a" };

    const expected = [a, b, c];
    assert.deepEqual(
      await resolvePluginList(installedPackageFixture, [a, b, c]),
      expected,
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
      dependencies: () => [
        Promise.resolve({ default: b }),
        Promise.resolve({ default: c }),
      ],
    };

    const expected = [b, c, a];
    assert.deepEqual(
      await resolvePluginList(installedPackageFixture, [a]),
      expected,
    );
  });

  it("should support shared dependencies", async () => {
    // A   B
    //  \ /
    //   C
    const c: HardhatPlugin = { id: "c" };
    const b: HardhatPlugin = {
      id: "b",
      dependencies: () => [Promise.resolve({ default: c })],
    };
    const a: HardhatPlugin = {
      id: "a",
      dependencies: () => [Promise.resolve({ default: c })],
    };

    const expected = [c, a, b];
    assert.deepEqual(
      await resolvePluginList(installedPackageFixture, [a, b]),
      expected,
    );
  });

  it("should support shared subdependencies", async () => {
    //   A
    //  / \
    // B   C
    //  \ /
    //   D
    const d: HardhatPlugin = { id: "d" };
    const c: HardhatPlugin = {
      id: "c",
      dependencies: () => [Promise.resolve({ default: d })],
    };
    const b: HardhatPlugin = {
      id: "b",
      dependencies: () => [Promise.resolve({ default: d })],
    };
    const a: HardhatPlugin = {
      id: "a",
      dependencies: () => [
        Promise.resolve({ default: b }),
        Promise.resolve({ default: c }),
      ],
    };

    const expected = [d, b, c, a];
    assert.deepEqual(
      await resolvePluginList(installedPackageFixture, [a]),
      expected,
    );
  });

  it("should support optional (resolved to undefined) dependencies", async () => {
    function makeOptional(
      dep: Promise<{ default: HardhatPlugin }>,
    ): Promise<{ default: HardhatPlugin } | undefined> {
      return dep.catch(() => undefined);
    }

    // C has no dependencies
    // B depends on C (mandatory) and "not-installed-package" (optional, not found)
    // A depends on B (optional found) and "not-installed-package" (optional, not found)
    //
    // Resolution of A includes B (optional found) and C (transitive from B)

    const c: HardhatPlugin = {
      id: "c",
    };
    const b: HardhatPlugin = {
      id: "b",
      dependencies: () => [
        Promise.resolve({ default: c }),
        makeOptional(import("./fixture-projects/not-installed-package")),
      ],
    };
    const a: HardhatPlugin = {
      id: "a",
      dependencies: () => [
        makeOptional(Promise.resolve({ default: b })),
        makeOptional(import("./fixture-projects/not-installed-package")),
      ],
    };

    const expected = [c, b, a];
    assert.deepEqual(
      await resolvePluginList(installedPackageFixture, [a]),
      expected,
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
    const h: HardhatPlugin = {
      id: "h",
      dependencies: () => [Promise.resolve({ default: i })],
    };
    const g: HardhatPlugin = {
      id: "g",
      dependencies: () => [Promise.resolve({ default: i })],
    };
    const f: HardhatPlugin = {
      id: "f",
      dependencies: () => [Promise.resolve({ default: h })],
    };
    const e: HardhatPlugin = {
      id: "e",
      dependencies: () => [Promise.resolve({ default: h })],
    };
    const d: HardhatPlugin = {
      id: "d",
      dependencies: () => [Promise.resolve({ default: g })],
    };
    const c: HardhatPlugin = {
      id: "c",
      dependencies: () => [Promise.resolve({ default: g })],
    };
    const b: HardhatPlugin = {
      id: "b",
      dependencies: () => [
        Promise.resolve({ default: d }),
        Promise.resolve({ default: e }),
        Promise.resolve({ default: f }),
      ],
    };
    const a: HardhatPlugin = {
      id: "a",
      dependencies: () => [
        Promise.resolve({ default: c }),
        Promise.resolve({ default: d }),
      ],
    };

    const expected = [i, g, c, d, a, h, e, f, b];
    assert.deepEqual(
      await resolvePluginList(installedPackageFixture, [a, b]),
      expected,
    );
  });

  it("should throw a HardhatError on finding different plugins with the same id", async () => {
    const a = { id: "dup" };
    const copy = { id: "dup" };

    await assertRejectsWithHardhatError(
      async () => resolvePluginList(installedPackageFixture, [a, copy]),
      HardhatError.ERRORS.CORE.GENERAL.DUPLICATED_PLUGIN_ID,
      {
        id: "dup",
      },
    );
  });

  describe("dependency loading errors", () => {
    it("should throw a general HardhatError on a dependency loading failing for unknown reasons", async () => {
      const plugin: HardhatPlugin = {
        id: "plugin",
        npmPackage: "example",
        dependencies: () => [Promise.reject(new Error("Unknown reasons"))],
      };

      await assertRejectsWithHardhatError(
        async () => resolvePluginList(installedPackageFixture, [plugin]),
        HardhatError.ERRORS.CORE.PLUGINS.PLUGIN_DEPENDENCY_FAILED_LOAD,
        { pluginId: plugin.id },
      );
    });

    it("should throw a plugin installation validation error if there is a dependency load failure", async () => {
      const notInstalledPackageFixture = import.meta.resolve(
        "./fixture-projects/not-installed-package",
      );

      const plugin: HardhatPlugin = {
        id: "example",
        npmPackage: "example",
        dependencies: () => [Promise.reject(new Error("Not installed"))],
      };

      await assertRejectsWithHardhatError(
        async () => resolvePluginList(notInstalledPackageFixture, [plugin]),
        HardhatError.ERRORS.CORE.PLUGINS.PLUGIN_NOT_INSTALLED,
        {
          pluginId: "example",
        },
      );
    });
  });
});
