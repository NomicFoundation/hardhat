import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { detectPluginNpmDependencyProblems } from "../../../src/internal/plugins/detect-plugin-npm-dependency-problems.js";
import { HardhatPlugin } from "../../../src/types/plugins.js";

describe("Plugins - detect npm dependency problems", () => {
  const plugin: HardhatPlugin = {
    id: "example-plugin",
    npmPackage: "example",
  };

  it("should skip validation if the plugin is not from an npm package", async () => {
    const peerDepWithWrongVersionFixture = import.meta.resolve(
      "./fixture-projects/peer-dep-with-wrong-version",
    );

    await assert.doesNotReject(async () =>
      detectPluginNpmDependencyProblems(
        {
          ...plugin,
          npmPackage: undefined,
        },
        peerDepWithWrongVersionFixture,
      ),
    );
  });

  describe("when the plugin has no peer deps", () => {
    it("should pass validation if the npm package has been installed", async () => {
      const installedPackageProjectFixture = import.meta.resolve(
        "./fixture-projects/installed-package",
      );

      await assert.doesNotReject(async () =>
        detectPluginNpmDependencyProblems(
          plugin,
          installedPackageProjectFixture,
        ),
      );
    });

    it("should fail validation if the npm package has not been installed", async () => {
      const nonInstalledPackageProjectFixture = import.meta.resolve(
        "./fixture-projects/not-installed-package",
      );

      await assert.rejects(
        async () =>
          detectPluginNpmDependencyProblems(
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
    describe("and the peer deps are installed in the top level `node_modules`", () => {
      it("should pass validation if the peer deps have been installed", async () => {
        const installedPeerDepsFixture = import.meta.resolve(
          "./fixture-projects/installed-peer-deps",
        );

        await assert.doesNotReject(async () =>
          detectPluginNpmDependencyProblems(plugin, installedPeerDepsFixture),
        );
      });

      it("should fail validation if a peer dependency is not installed", async () => {
        const notInstalledPeerDepFixture = import.meta.resolve(
          "./fixture-projects/not-installed-peer-dep",
        );

        await assert.rejects(
          detectPluginNpmDependencyProblems(plugin, notInstalledPeerDepFixture),
          {
            name: "HardhatError",
            message:
              'HHE1201: Plugin "example-plugin" is missing a peer dependency "peer2".',
          },
        );
      });
    });

    describe("and the peer deps are installed in the `node_modules` of the plugin package", () => {
      it("should pass validation if the peer deps have been installed", async () => {
        const installedPeerDepsFixture = import.meta.resolve(
          "./fixture-projects/installed-peer-deps-as-sub-node-modules",
        );

        await assert.doesNotReject(async () =>
          detectPluginNpmDependencyProblems(plugin, installedPeerDepsFixture),
        );
      });
    });
  });

  describe("when the plugin has a peer dep installed but it is the wrong version", () => {
    it("should fail validation if a peer dependency is outside of the semver range", async () => {
      const peerDepWithWrongVersionFixture = import.meta.resolve(
        "./fixture-projects/peer-dep-with-wrong-version",
      );

      await assert.rejects(
        async () =>
          detectPluginNpmDependencyProblems(
            plugin,
            peerDepWithWrongVersionFixture,
          ),
        {
          name: "HardhatError",
          message:
            'HHE1202: Plugin "example-plugin" has a peer dependency "peer2" with expected version "^1.0.0" but the installed version is "2.0.0".',
        },
      );
    });
  });
});
