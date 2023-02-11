class ArtifactsSourceStub {
  constructor(sourceIndex) {
    this._sourceIndex = sourceIndex;
  }

  async readArtifact(name) {
    if (name === "B") {
      return {
        contractName: "B",
        sourceIndex: this._sourceIndex,
      };
    }

    return undefined;
  }

  readArtifactSync(name) {
    if (name === "B") {
      return {
        contractName: "B",
        sourceIndex: this._sourceIndex,
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
  return new ArtifactsSourceStub(0);
});

experimentalExtendArtifacts((config) => {
  return new ArtifactsSourceStub(1);
});

module.exports = {
  solidity: "0.5.15",
};
