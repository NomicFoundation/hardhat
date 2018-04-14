const fs = require("fs-extra");
const path = require("path");
const download = require("download");

const exceptions = require("./exceptions");
const solcWrapper = require("solc/wrapper");

const COMPILER_FILES_DIR_URL =
  "https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/bin/";

const COMPILERS_LIST_URL = COMPILER_FILES_DIR_URL + "list.json";

class Compiler {
  constructor(version, compilersDir = "cache/compilers") {
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

  async compileGraph(graph) {
    const sources = {};
    for (const file of graph.getResolvedFiles()) {
      const fileContent = (await fs.readFile(file.absolutePath)).toString(
        "utf-8"
      );

      sources[file.name] = {
        content: fileContent
      };
    }

    const solc = await this.getSolc();

    const jsonOutput = solc.compileStandardWrapper(
      JSON.stringify({
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
      })
    );

    const output = JSON.parse(jsonOutput);

    let hasErrors = false;
    if (output.errors) {
      for (const error of output.errors) {
        hasErrors = hasErrors || error.severity === "error";
        if (error.severity === "error") {
          hasErrors = true;
          console.log("\n");
          console.error(error.formattedMessage);
        } else {
          console.log("\n");
          console.warn(error.formattedMessage);
        }
      }
    }

    if (hasErrors || !output.contracts) {
      return undefined;
    }

    return output;
  }

  async getSolc() {
    if (this.loadedSolc !== undefined) {
      return this.loadedSolc;
    }

    const localSolcVersion = Compiler.getLocalSolcVersion();

    if (this.version === undefined || this.version === localSolcVersion) {
      console.debug("Using local solc version");
      this.loadedSolc = require("solc");
      return this.loadedSolc;
    }

    console.debug("Using remote solc version");

    try {
      const compilerFileName = await this.getCompilerBinFilename();
      const compilerPath = await this.downloadCompiler(compilerFileName);
      const absoluteCompilerPath = await fs.realpath("./" + compilerPath);

      this.loadedSolc = solcWrapper(require(absoluteCompilerPath));

      return this.loadedSolc;
    } catch (e) {
      if (e instanceof exceptions.DownloadError) {
        console.warn(
          "Couldn't download compiler version " +
            this.version +
            ". Please check your connection or use local version " +
            localSolcVersion
        );
      }

      throw e;
    }
  }

  static getLocalSolcVersion() {
    return require("solc/package.json").version;
  }

  async getCompilerBinFilename() {
    if (this.version === undefined) {
      throw new Error("No compiler version specified");
    }

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
      throw new exceptions.InvalidConfigError(
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
      console.debug("Downloading compiler");
      const compilerUrl = COMPILER_FILES_DIR_URL + compilerFileName;
      try {
        await download(compilerUrl, this.compilersDir);
      } catch (e) {
        throw new exceptions.DownloadError(
          "Couldn't download compiler file",
          e
        );
      }
    }

    return compilerPath;
  }

  async downloadVersionsList() {
    try {
      await download(COMPILERS_LIST_URL, this.compilersDir);
    } catch (e) {
      throw new exceptions.DownloadError(
        "Couldn't download compiler versions list",
        e
      );
    }
  }
}

module.exports = Compiler;
