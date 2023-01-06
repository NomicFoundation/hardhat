const assert = require("assert");

// used by script.js to test artifact extensions
class ArtifactsSourceStub {
  async readArtifact(name) {
    if (name === "B") {
      return {
        contractName: "B",
      };
    }

    return undefined;
  }

  readArtifactSync(name) {
    if (name === "B") {
      return {
        contractName: "B",
      };
    }

    return undefined;
  }

  async artifactExists(name) {
    return name === "B";
  }

  async getAllFullyQualifiedNames() {
    return [];
  }

  async getBuildInfo() {
    return undefined;
  }

  async getArtifactPaths() {
    return [];
  }

  async getDebugFilePaths() {
    return [];
  }

  async getBuildInfoPaths() {
    return [];
  }

  clearCache() {}

  disableCache() {}
}

experimentalExtendArtifacts((config) => {
  // we assert that the resolved config is received, just in case
  assert.equal(config.solidity.compilers[0].version, "0.5.15");

  return new ArtifactsSourceStub();
});

module.exports = {
  solidity: "0.5.15",
};
