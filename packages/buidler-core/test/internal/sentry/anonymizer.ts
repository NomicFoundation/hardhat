import { assert } from "chai";
import * as path from "path";

import { Anonymizer } from "../../../src/internal/sentry/anonymizer";

const PROJECT_ROOT = "/path/to/project";

class MockedAnonymizer extends Anonymizer {
  public getFilePackageJsonPathResult: string | null = null;

  protected _getFilePackageJsonPath(_: string): string | null {
    return this.getFilePackageJsonPathResult;
  }
}

describe("Anonymizer", () => {
  it("should anonymize paths of the user's project", () => {
    const anonymizer = new Anonymizer();
    const anonymizationResult = anonymizer.anonymizeFilename(
      path.join(PROJECT_ROOT, "src", "someFile.js")
    );

    assert.equal(anonymizationResult.anonymizedFilename, "<user-file>");
    assert.isTrue(anonymizationResult.anonymizeContent);
  });

  it("should anonymize paths of the user's project in the project's root", () => {
    const anonymizer = new Anonymizer();
    const anonymizationResult = anonymizer.anonymizeFilename(
      path.join(PROJECT_ROOT, "someFile.js")
    );

    assert.equal(anonymizationResult.anonymizedFilename, "<user-file>");
    assert.isTrue(anonymizationResult.anonymizeContent);
  });

  it("should not anonymize paths of buidler files", () => {
    const anonymizer = new Anonymizer();
    const buidlerFilePath = path.join(
      "node_modules",
      "@nomiclabs",
      "buidler-core",
      "someBuidlerFile.js"
    );
    const anonymizationResult = anonymizer.anonymizeFilename(
      path.join(PROJECT_ROOT, buidlerFilePath)
    );

    assert.equal(
      anonymizationResult.anonymizedFilename,
      path.join(buidlerFilePath)
    );
    assert.isFalse(anonymizationResult.anonymizeContent);
  });

  it("should not anonymize internal node paths", () => {
    const anonymizer = new Anonymizer();
    const internalNodePath = path.join("internal", "some", "module", "main.js");
    const anonymizationResult = anonymizer.anonymizeFilename(internalNodePath);

    assert.equal(anonymizationResult.anonymizedFilename, internalNodePath);
    assert.isFalse(anonymizationResult.anonymizeContent);
  });

  describe("buidler config", () => {
    it("should return only the config's relative path", () => {
      const pathToBuidlerConfig = path.join(PROJECT_ROOT, "buidler.config.ts");
      const anonymizer = new MockedAnonymizer(pathToBuidlerConfig);
      anonymizer.getFilePackageJsonPathResult = path.join(
        PROJECT_ROOT,
        "package.json"
      );

      const anonymizationResult = anonymizer.anonymizeFilename(
        pathToBuidlerConfig
      );

      assert.equal(anonymizationResult.anonymizedFilename, "buidler.config.ts");
      assert.isTrue(anonymizationResult.anonymizeContent);
    });

    it("should return only the config's relative path when it's not in the root", () => {
      const pathToBuidlerConfig = path.join(
        PROJECT_ROOT,
        "config",
        "buidler.config.ts"
      );
      const anonymizer = new MockedAnonymizer(pathToBuidlerConfig);
      anonymizer.getFilePackageJsonPathResult = path.join(
        PROJECT_ROOT,
        "package.json"
      );

      const anonymizationResult = anonymizer.anonymizeFilename(
        pathToBuidlerConfig
      );

      assert.equal(
        anonymizationResult.anonymizedFilename,
        path.join("config", "buidler.config.ts")
      );
      assert.isTrue(anonymizationResult.anonymizeContent);
    });

    it("should return only the config's base name if package.json cannot be found", () => {
      const pathToBuidlerConfig = path.join(
        PROJECT_ROOT,
        "config",
        "buidler.config.ts"
      );
      const anonymizer = new MockedAnonymizer(pathToBuidlerConfig);

      const anonymizationResult = anonymizer.anonymizeFilename(
        pathToBuidlerConfig
      );

      assert.equal(anonymizationResult.anonymizedFilename, "buidler.config.ts");
      assert.isTrue(anonymizationResult.anonymizeContent);
    });
  });
});
