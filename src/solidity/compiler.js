"use strict";

const importLazy = require('import-lazy')(require);
const path = require("path");
const fs = importLazy("fs-extra");
const download = importLazy("download");
const solcWrapper = importLazy("solc/wrapper");
const ethUtil = importLazy("ethereumjs-util");

const COMPILER_FILES_DIR_URL =
  "https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/bin/";

const COMPILERS_LIST_URL = COMPILER_FILES_DIR_URL + "list.json";

class Compiler {
  constructor(version, compilersDir, optimizerConfig) {
    this.version = version;
    this.compilersDir = compilersDir;
    this.optimizerConfig = optimizerConfig;
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
        optimizer: this.optimizerConfig,
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

    this.loadedSolc = solcWrapper(require(compilerPath));

    return this.loadedSolc;
  }

  getLocalSolcVersion() {
    return require("solc/package.json").version;
  }

  async getCompilerBinFilename() {
    const compilersListExisted = this.compilerListExists();

    let list = await this.getCompilerList();
    let fileName = this.getChosenVersionPath(list);

    // We may need to re-download the compilers list.
    if (fileName === undefined && compilersListExisted) {
      await fs.unlink(compilersListPath);

      list = await this.getCompilerList();
      fileName = this.getChosenVersionPath(list);
    }

    if (fileName === undefined) {
      throw new Error(
        "Solidity version " +
          this.version +
          " is invalid or hasn't been" +
          " released yet"
      );
    }

    return fileName;
  }

  getChosenVersionPath(list) {
    return list.releases[this.version];
  }

  async downloadCompiler(compilerFileName) {
    const compilerPath = path.join(this.compilersDir, compilerFileName);

    if (!(await fs.pathExists(compilerPath))) {
      const compilerUrl = COMPILER_FILES_DIR_URL + compilerFileName;

      console.debug("Downloading compiler version " + this.version);

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

    await this.validateCompiler(compilerPath, compilerFileName);

    return compilerPath;
  }

  getCompilerListPath() {
    return path.join(this.compilersDir, "list.json");
  }

  async compilerListExists() {
    return fs.pathExists(this.getCompilerListPath());
  }

  async getCompilerList() {
    if (!(await this.compilerListExists())) {
      await this.downloadVersionsList();
    }

    return fs.readJson(this.getCompilerListPath());
  }

  async downloadVersionsList() {
    try {
      await fs.ensureDir(this.compilersDir);
      await download(COMPILERS_LIST_URL, this.compilersDir);
    } catch (e) {
      throw Error(
        "Couldn't download compiler versions list. Please check your " +
          "connection or use local version " +
          this.getLocalSolcVersion()
      );
    }
  }

  async validateCompiler(compilerPath, compilerFileName) {
    const list = await this.getCompilerList();
    const compilerInfo = list.builds.filter(
      b => b.path === compilerFileName
    )[0];
    const expectedKeccak256 = compilerInfo.keccak256;

    const compiler = await fs.readFile(compilerPath);

    const compilerKeccak256 = "0x" + ethUtil.keccak(compiler).toString("hex");

    if (expectedKeccak256 !== compilerKeccak256) {
      await fs.unlink(compilerPath);
      throw new Error(
        "Couldn't download compiler version " +
          this.version +
          ". Downloaded version checksum doesn't much the expected one. Please" +
          " check your connection or use local version " +
          this.getLocalSolcVersion()
      );
    }
  }
}

module.exports = Compiler;
