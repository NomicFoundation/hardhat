import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validatePluginNpmDependencies } from "../../src/internal/plugins/plugin-validation.js";
import { HardhatPlugin } from "../../src/types/plugins.js";

describe("Plugins - plugin validation", () => {
  const plugin: HardhatPlugin = {
    id: "example-plugin",
    npmPackage: "example",
  };

  it("should skip validation if the plugin is not from an npm package", async () => {
    await assert.doesNotReject(async () =>
      validatePluginNpmDependencies({
        ...plugin,
        npmPackage: undefined,
      }),
    );
  });

  describe("when the plugin has no peer deps", () => {
    it("should pass validation if the npm package has been installed", async () => {
      const installedPackageProjectFixture = import.meta.resolve(
        "./fixture-projects/installed-package",
      );

      await assert.doesNotReject(async () =>
        validatePluginNpmDependencies(plugin, installedPackageProjectFixture),
      );
    });

    it("should fail validation if the npm package has not been installed", async () => {
      const nonInstalledPackageProjectFixture = import.meta.resolve(
        "./fixture-projects/not-installed-package",
      );

      await assert.rejects(
        async () =>
          validatePluginNpmDependencies(
            plugin,
            nonInstalledPackageProjectFixture,
          ),
        {
          name: "HardhatError",
          message: 'HHE1200: Plugin "example-plugin" is not installed.',
        },
      );
    });
  });

  describe("when the plugin has peer deps", () => {
    it("should pass validation if the peer deps have been installed", async () => {
      const installedPeerDepsFixture = import.meta.resolve(
        "./fixture-projects/installed-peer-deps",
      );

      await assert.doesNotReject(async () =>
        validatePluginNpmDependencies(plugin, installedPeerDepsFixture),
      );
    });

    it("should fail validation if a peer dependency is not installed", async () => {
      const notInstalledPeerDepFixture = import.meta.resolve(
        "./fixture-projects/not-installed-peer-dep",
      );

      await assert.rejects(
        validatePluginNpmDependencies(plugin, notInstalledPeerDepFixture),
        {
          name: "HardhatError",
          message:
            'HHE1201: Plugin "example-plugin" is missing a peer dependency "peer2".',
        },
      );
    });
  });

  describe("when the plugin has a peer dep installed but it is the wrong version", () => {
    it("should fail validation if a peer dependency is outside of the semver range", async () => {
      const peerDepWithWrongVersionFixture = import.meta.resolve(
        "./fixture-projects/peer-dep-with-wrong-version",
      );

      await assert.rejects(
        async () =>
          validatePluginNpmDependencies(plugin, peerDepWithWrongVersionFixture),
        {
          name: "HardhatError",
          message:
            'HHE1202: Plugin "example-plugin" has a peer dependency "peer2" with version "2.0.0" but version "^1.0.0" is needed.',
        },
      );
    });
  });
});
