import type { HardhatPlugin } from "../../../../src/types/plugins.js";

import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { detectPluginNpmDependencyProblems } from "../../../../src/internal/core/plugins/detect-plugin-npm-dependency-problems.js";

describe("Plugins - detect npm dependency problems", () => {
  const plugin: HardhatPlugin = {
    id: "example-plugin",
    npmPackage: "example",
  };

  it("should skip validation if the plugin is not from an npm package", async () => {
    const peerDepWithWrongVersionFixture = import.meta.resolve(
      "./fixture-projects/peer-dep-with-wrong-version",
    );

    await detectPluginNpmDependencyProblems(peerDepWithWrongVersionFixture, {
      ...plugin,
      npmPackage: undefined,
    });
  });

  describe("when the plugin has no peer deps", () => {
    it("should pass validation if the npm package has been installed", async () => {
      const installedPackageProjectFixture = import.meta.resolve(
        "./fixture-projects/installed-package",
      );

      await detectPluginNpmDependencyProblems(
        installedPackageProjectFixture,
        plugin,
      );
    });

    it("should fail validation if the npm package has not been installed", async () => {
      const nonInstalledPackageProjectFixture = import.meta.resolve(
        "./fixture-projects/not-installed-package",
      );

      await assertRejectsWithHardhatError(
        async () =>
          detectPluginNpmDependencyProblems(
            nonInstalledPackageProjectFixture,
            plugin,
          ),
        HardhatError.ERRORS.CORE.PLUGINS.PLUGIN_NOT_INSTALLED,
        {
          pluginId: "example-plugin",
        },
      );
    });
  });

  describe("when the plugin has peer deps", () => {
    describe("and the peer deps are installed in the top level `node_modules`", () => {
      it("should pass validation if the peer deps have been installed", async () => {
        const installedPeerDepsFixture = import.meta.resolve(
          "./fixture-projects/installed-peer-deps",
        );

        await detectPluginNpmDependencyProblems(
          installedPeerDepsFixture,
          plugin,
        );
      });

      it("should fail validation if a peer dependency is not installed", async () => {
        const notInstalledPeerDepFixture = import.meta.resolve(
          "./fixture-projects/not-installed-peer-dep",
        );

        await assertRejectsWithHardhatError(
          detectPluginNpmDependencyProblems(notInstalledPeerDepFixture, plugin),
          HardhatError.ERRORS.CORE.PLUGINS.PLUGIN_MISSING_DEPENDENCY,
          { pluginId: "example-plugin", peerDependencyName: "peer2" },
        );
      });
    });

    describe("and the peer deps are installed in the `node_modules` of the plugin package", () => {
      it("should pass validation if the peer deps have been installed", async () => {
        const installedPeerDepsFixture = import.meta.resolve(
          "./fixture-projects/installed-peer-deps-as-sub-node-modules",
        );

        await detectPluginNpmDependencyProblems(
          installedPeerDepsFixture,
          plugin,
        );
      });
    });
  });

  describe("when the plugin has a peer dep installed but it is the wrong version", () => {
    it("should fail validation if a peer dependency is outside of the semver range", async () => {
      const peerDepWithWrongVersionFixture = import.meta.resolve(
        "./fixture-projects/peer-dep-with-wrong-version",
      );

      await assertRejectsWithHardhatError(
        async () =>
          detectPluginNpmDependencyProblems(
            peerDepWithWrongVersionFixture,
            plugin,
          ),
        HardhatError.ERRORS.CORE.PLUGINS.DEPENDENCY_VERSION_MISMATCH,
        {
          pluginId: "example-plugin",
          peerDependencyName: "peer2",
          expectedVersion: "^1.0.0",
          installedVersion: "2.0.0",
        },
      );
    });
  });
});
