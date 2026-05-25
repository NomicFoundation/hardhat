import type { HardhatPlugin } from "../../../../src/types/plugins.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getLoadedPlugins,
  registerLoadedPlugin,
} from "../../../../src/internal/core/plugins/loaded-plugins-registry.js";
import { definePlugin } from "../../../../src/plugins.js";

describe("loaded plugins registry", () => {
  it("definePlugin returns its argument unchanged", () => {
    const plugin: HardhatPlugin = {
      id: "test:returns-arg",
      npmPackage: "test-pkg",
    };

    assert.equal(definePlugin(plugin), plugin);
  });

  it("definePlugin registers the plugin id in the loaded set", () => {
    const plugin: HardhatPlugin = {
      id: "test:register-id",
    };

    definePlugin(plugin);

    assert.equal(getLoadedPlugins().get(plugin.id), plugin);
  });

  it("dedupes by id when called twice with the same id", () => {
    const first: HardhatPlugin = { id: "test:dedupe", npmPackage: "first" };
    const second: HardhatPlugin = { id: "test:dedupe", npmPackage: "second" };

    definePlugin(first);
    definePlugin(second);

    assert.equal(getLoadedPlugins().get("test:dedupe"), second);
  });

  it("registerLoadedPlugin behaves like the side effect of definePlugin", () => {
    const plugin: HardhatPlugin = { id: "test:register-direct" };

    registerLoadedPlugin(plugin);

    assert.equal(getLoadedPlugins().get(plugin.id), plugin);
  });
});
