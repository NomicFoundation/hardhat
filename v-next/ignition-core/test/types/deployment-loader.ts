import { assert } from "chai";

import { EphemeralDeploymentLoader } from "../../src/internal/deployment-loader/ephemeral-deployment-loader.js";
import { FileDeploymentLoader } from "../../src/internal/deployment-loader/file-deployment-loader.js";
import type { DeploymentLoader } from "../../src/internal/deployment-loader/types.js";
import { setupMockArtifactResolver } from "../helpers.js";
import type { ExactInterface } from "../helpers/exact-interface.js";

describe("DeploymentLoaderImpls", function () {
  describe("file-deployment-loader", () => {
    it("Shouldn't have any property apart from the ones defined in the Deployment loader interface", function () {
      const _implementation: ExactInterface<
        DeploymentLoader,
        // we omit readBuildInfo as it is a known addition to file deployment loader
        // above the DeploylmentLoader interface
        Omit<FileDeploymentLoader, "readBuildInfo">
      > = new FileDeploymentLoader("./example");

      assert.isDefined(_implementation);
    });
  });

  describe("ephemeral-deployment-loader", () => {
    it("Shouldn't have any property apart from the ones defined in the Deployment loader interface", function () {
      const _implementation: ExactInterface<
        DeploymentLoader,
        EphemeralDeploymentLoader
      > = new EphemeralDeploymentLoader(setupMockArtifactResolver());

      assert.isDefined(_implementation);
    });
  });
});
