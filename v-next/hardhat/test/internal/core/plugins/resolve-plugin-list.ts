/* eslint-disable prefer-const -- test*/
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

describe("Plugins - resolve plugin list - conditional dependencies", () => {
  // Helper function that simulates loading a module that returns a plugin
  async function mod(plugin: HardhatPlugin) {
    return { default: plugin };
  }

  let A: HardhatPlugin;
  let B: HardhatPlugin;
  let C: HardhatPlugin;
  let D: HardhatPlugin;
  let E: HardhatPlugin;
  let F: HardhatPlugin;
  let G: HardhatPlugin;
  let H: HardhatPlugin;
  let I: HardhatPlugin;
  let J: HardhatPlugin;
  let K: HardhatPlugin;
  let L: HardhatPlugin;
  let M: HardhatPlugin;

  A = {
    id: "A",
    conditionalDependencies: [
      {
        condition: () => [mod(B)],
        plugin: () => mod(D),
      },
    ],
  };

  B = {
    id: "B",
    conditionalDependencies: [
      {
        condition: () => [mod(E), mod(G)],
        plugin: () => mod(F),
      },
    ],
  };

  C = {
    id: "C",
    dependencies: () => {
      return [mod(B)];
      // return [];
    },
  };

  D = {
    id: "D",
    dependencies: () => {
      return [mod(E)];
    },
  };

  E = {
    id: "E",
    dependencies: () => {
      return [];
    },
    conditionalDependencies: [
      {
        condition: () => [mod(D)],
        plugin: () => mod(G),
      },
    ],
  };

  F = {
    id: "F",
    conditionalDependencies: [
      {
        condition: () => [import(`${"nonexistant"}`)],
        plugin: () => mod(G),
      },
    ],
  };

  G = {
    id: "G",
  };

  H = {
    id: "H",
    conditionalDependencies: [
      {
        condition: () => [mod(G)],
        plugin: () => mod(F),
      },
    ],
  };

  I = {
    id: "I",
    conditionalDependencies: [
      {
        condition: () => [mod(B)],
        plugin: () => mod(G),
      },
    ],
  };

  J = {
    id: "J",
    conditionalDependencies: [
      {
        condition: () => [mod(G)],
        plugin: () => mod(C),
      },
      {
        condition: () => [mod(B)],
        plugin: () => mod(F),
      },
    ],
  };

  K = {
    id: "K",
    conditionalDependencies: [
      {
        condition: () => [mod(G)],
        plugin: () => mod(L),
      },
      {
        condition: () => [mod(L)],
        plugin: () => mod(M),
      },
      {
        condition: () => [mod(M)],
        plugin: () => mod(F),
      },
    ],
  };

  L = {
    id: "L",
    conditionalDependencies: [
      {
        condition: () => [mod(B)],
        plugin: () => mod(G),
      },
    ],
  };

  M = {
    id: "M",
    conditionalDependencies: [
      {
        condition: () => [mod(B)],
        plugin: () => mod(G),
      },
    ],
  };

  // Helper function to get plugin ids
  function ids(plugins: HardhatPlugin[]) {
    return plugins.map((p) => p.id);
  }

  it("doesn't load a conditional dependency if the conditions are not met", async () => {
    const resolvedPlugins = await resolvePluginList(process.cwd(), [A]);
    assert.deepEqual(resolvedPlugins, [A]);
  });

  it("doesn't load a conditional dependency if only one of the conditions are not met", async () => {
    const resolvedPlugins = await resolvePluginList(process.cwd(), [B, G]);
    assert.deepEqual(resolvedPlugins, [B, G]);
  });

  it("doesn't load a conditional dependency if one of the conditions is not installed", async () => {
    const resolvedPlugins = await resolvePluginList(process.cwd(), [F]);
    assert.deepEqual(resolvedPlugins, [F]);
  });

  it("loads a conditional dependency if the condition is met, on the initial plugin list", async () => {
    const resolvedPlugins = await resolvePluginList(process.cwd(), [D, E]);
    assert.deepEqual(ids(resolvedPlugins), ["E", "D", "G"]); // D is loaded initially, E conditionally loads G
  });

  it("loads a conditional dependency if the condition is met, from a dependency from the initial list", async () => {
    const resolvedPlugins = await resolvePluginList(process.cwd(), [C, I]);
    assert.deepEqual(ids(resolvedPlugins), ["B", "C", "I", "G"]); // C loads B, I conditionally loads G because of B
  });

  it("loads a conditional dependency if the condition is met, from a conditional dependency of a plugin on the initial list", async () => {
    const resolvedPlugins = await resolvePluginList(process.cwd(), [B, I, H]);
    assert.deepEqual(ids(resolvedPlugins), ["B", "I", "H", "G", "F"]); // I conditionally loads G because of B, then H conditionally loads F because of G
  });

  it("loads a conditional dependency if the condition is met, from a dependency of a conditional dependency", async () => {
    const resolvedPlugins = await resolvePluginList(process.cwd(), [J, G]);
    assert.deepEqual(ids(resolvedPlugins), ["J", "G", "B", "C", "F"]); // J conditionally loads C because of G. C loads B, J loads F because of B
  });

  it("loads a conditional dependency if the condition is met, from a conditional dependency of a conditional dependency", async () => {
    const resolvedPlugins = await resolvePluginList(process.cwd(), [K, G]);
    assert.deepEqual(ids(resolvedPlugins), ["K", "G", "L", "M", "F"]); // K loads L because of G, then M because of L, then F because of M
  });
});
