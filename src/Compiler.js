const fs = require("fs-extra");
const path = require("path");
const download = require("download");
const solcWrapper = require("solc/wrapper");

const COMPILER_FILES_DIR_URL =
  "https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/bin/";

const COMPILERS_LIST_URL = COMPILER_FILES_DIR_URL + "list.json";

class Compiler {
  constructor(version, compilersDir) {
    this.version = version;
    this.compilersDir = compilersDir;
  }

  getInputFromDependencyGraph(graph) {
    const sources = {};
    for (const file of graph.getResolvedFiles()) {
      sources[file.globalName] = {
        content: file.content
      };
    }

    return {
      language: "Solidity",
      sources,
      settings: {
        evmVersion: "byzantium",
        metadata: {
          useLiteralContent: true
        },
        outputSelection: {
          "*": {
            "*": ["evm.bytecode.object", "abi"],
            "": ["ast"]
          }
        }
      }
    };
  }

  async compile(input) {
    const solc = await this.getSolc();

    const jsonOutput = solc.compileStandardWrapper(JSON.stringify(input));
    return JSON.parse(jsonOutput);
  }

  async getSolc() {
    if (this.loadedSolc !== undefined) {
      return this.loadedSolc;
    }

    const localSolcVersion = this.getLocalSolcVersion();

    if (this.version === undefined || this.version === localSolcVersion) {
      this.loadedSolc = require("solc");
      return this.loadedSolc;
    }

    const compilerFileName = await this.getCompilerBinFilename();
    const compilerPath = await this.downloadCompiler(compilerFileName);
    const absoluteCompilerPath = await fs.realpath(compilerPath);

    this.loadedSolc = solcWrapper(require(absoluteCompilerPath));

    return this.loadedSolc;
  }

  getLocalSolcVersion() {
    return require("solc/package.json").version;
  }

  async getCompilerBinFilename() {
    const compilersListPath = path.join(this.compilersDir, "list.json");
    const compilersListExisted = await fs.pathExists(compilersListPath);

    if (!compilersListExisted) {
      await fs.ensureDir(this.compilersDir);
      await this.downloadVersionsList();
    }

    let list = await fs.readJson(compilersListPath);
    let fileName = list.releases[this.version];

    // We may need to re-download the compilers list.
    if (fileName === undefined && compilersListExisted) {
      await fs.unlink(compilersListPath);
      await this.downloadVersionsList();

      list = await fs.readJson(compilersListPath);
      fileName = list.releases[this.version];
    }

    if (fileName === undefined) {
      throw new Error(
        "Solidity version " +
          this.version +
          " is invalid or hasn't been released yet"
      );
    }

    return fileName;
  }

  async downloadCompiler(compilerFileName) {
    const compilerPath = path.join(this.compilersDir, compilerFileName);

    if (!(await fs.pathExists(compilerPath))) {
      const compilerUrl = COMPILER_FILES_DIR_URL + compilerFileName;

      try {
        await download(compilerUrl, this.compilersDir);
      } catch (e) {
        throw new Error(
          "Couldn't download compiler version " +
            this.version +
            ". Please check your connection or use local version " +
            this.getLocalSolcVersion()
        );
      }
    }

    return compilerPath;
  }

  async downloadVersionsList() {
    try {
      await download(COMPILERS_LIST_URL, this.compilersDir);
    } catch (e) {
      throw Error(
        "Couldn't download compiler versions list. Please check your connection or use local version " +
          this.getLocalSolcVersion()
      );
    }
  }
}

module.exports = Compiler;
