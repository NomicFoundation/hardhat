/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { EphemeralDeploymentLoader } from "../../src/internal/deployment-loader/ephemeral-deployment-loader";
import { FileDeploymentLoader } from "../../src/internal/deployment-loader/file-deployment-loader";
import { DeploymentLoader } from "../../src/internal/deployment-loader/types";
import { setupMockArtifactResolver } from "../helpers";
import { ExactInterface } from "../helpers/exact-interface";

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
