/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { EphemeralDeploymentLoader } from "../../../src/new-api/internal/deployment-loader/ephemeral-deployment-loader";
import { FileDeploymentLoader } from "../../../src/new-api/internal/deployment-loader/file-deployment-loader";
import { DeploymentLoader } from "../../../src/new-api/types/deployment-loader";
import { ExactInterface } from "../../helpers/exact-interface";
import { setupMockArtifactResolver } from "../helpers";

describe("DeploymentLoaderImpls", function () {
  describe("file-deployment-loader", () => {
    it("Shouldn't have any property apart from the ones defined in the Deployment loader interface", function () {
      const _implementation: ExactInterface<
        DeploymentLoader,
        FileDeploymentLoader
      > = new FileDeploymentLoader("./example", true);

      assert.isDefined(_implementation);
    });
  });

  describe("ephemeral-deployment-loader", () => {
    it("Shouldn't have any property apart from the ones defined in the Deployment loader interface", function () {
      const _implementation: ExactInterface<
        DeploymentLoader,
        EphemeralDeploymentLoader
      > = new EphemeralDeploymentLoader(setupMockArtifactResolver(), true);

      assert.isDefined(_implementation);
    });
  });
});
