import type { HardhatPlugin } from "../../../../src/types/plugins.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { styleText } from "node:util";

import { warnAboutUnusedLoadedPlugins } from "../../../../src/internal/core/plugins/unused-plugins-warning.js";

function captureErrors(): {
  printError: (message: string) => void;
  messages: string[];
} {
  const messages: string[] = [];
  return {
    printError: (message) => messages.push(message),
    messages,
  };
}

const WARNING_HEADER =
  styleText(["bold", "yellow"], "Warning:") +
  " the following plugins were imported but are not present in your `plugins` array in hardhat.config.ts:";

const WARNING_FOOTER =
  "  Add them to `plugins: [...]` in your config to enable them, or remove the import(s) to remove this warning.";

describe("warnAboutUnusedLoadedPlugins", () => {
  it("emits a warning listing plugins that are loaded but not resolved", () => {
    const orphan: HardhatPlugin = {
      id: "hardhat-orphan",
      npmPackage: "@nomicfoundation/hardhat-orphan",
    };

    const { printError, messages } = captureErrors();
    warnAboutUnusedLoadedPlugins([], printError, [orphan]);

    assert.deepEqual(messages, [
      [
        "",
        WARNING_HEADER,
        "",
        "  - @nomicfoundation/hardhat-orphan  (id: hardhat-orphan)",
        "",
        WARNING_FOOTER,
        "",
      ].join("\n"),
    ]);
  });

  it("does not warn when the loaded plugin is in the resolved list", () => {
    const inConfig: HardhatPlugin = { id: "hardhat-in-config" };

    const { printError, messages } = captureErrors();
    warnAboutUnusedLoadedPlugins([inConfig], printError, [inConfig]);

    assert.deepEqual(messages, []);
  });

  it("does not warn when the loaded plugin is in the resolved list as a transitive dep", () => {
    const dep: HardhatPlugin = { id: "hardhat-transitive-dep" };
    const parent: HardhatPlugin = {
      id: "hardhat-transitive-parent",
      dependencies: () => [Promise.resolve({ default: dep })],
    };

    const { printError, messages } = captureErrors();
    warnAboutUnusedLoadedPlugins([parent, dep], printError, [parent, dep]);

    assert.deepEqual(messages, []);
  });

  it("falls back to id only when npmPackage is missing", () => {
    const noPackage: HardhatPlugin = { id: "hardhat-no-pkg" };

    const { printError, messages } = captureErrors();
    warnAboutUnusedLoadedPlugins([], printError, [noPackage]);

    assert.deepEqual(messages, [
      [
        "",
        WARNING_HEADER,
        "",
        "  - hardhat-no-pkg",
        "",
        WARNING_FOOTER,
        "",
      ].join("\n"),
    ]);
  });

  it("lists every orphan in a single warning block", () => {
    const orphanA: HardhatPlugin = {
      id: "hardhat-orphan-a",
      npmPackage: "@nomicfoundation/hardhat-orphan-a",
    };
    const orphanB: HardhatPlugin = { id: "hardhat-orphan-b" };

    const { printError, messages } = captureErrors();
    warnAboutUnusedLoadedPlugins([], printError, [orphanA, orphanB]);

    assert.deepEqual(messages, [
      [
        "",
        WARNING_HEADER,
        "",
        "  - @nomicfoundation/hardhat-orphan-a  (id: hardhat-orphan-a)",
        "  - hardhat-orphan-b",
        "",
        WARNING_FOOTER,
        "",
      ].join("\n"),
    ]);
  });
});
