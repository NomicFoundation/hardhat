import path from "path";

const { BuidlerError, ERRORS } = require("../core/errors");

const COMPILER_FILES_DIR_URL =
  "https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/bin/";

const COMPILERS_LIST_URL = COMPILER_FILES_DIR_URL + "list.json";

export class Compiler {
  private loadedSolc?: any;

  constructor(
    private readonly version: string,
    private readonly compilersDir: string,
    private readonly optimizerConfig: string
  ) {}

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

    const solcWrapper = await import("solc/Wrapper");
    this.loadedSolc = solcWrapper(await import(compilerPath));

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
      const fsExtra = await import("fs-extra");
      await fsExtra.unlink(this.getCompilerListPath());

      list = await this.getCompilerList();
      fileName = this.getChosenVersionPath(list);
    }

    if (fileName === undefined) {
      throw new BuidlerError(ERRORS.COMPILER_INVALID_VERSION, this.version);
    }

    return fileName;
  }

  getChosenVersionPath(list) {
    return list.releases[this.version];
  }

  async downloadCompiler(compilerFileName) {
    const compilerPath = path.join(this.compilersDir, compilerFileName);

    const fsExtra = await import("fs-extra");
    if (!(await fsExtra.pathExists(compilerPath))) {
      const compilerUrl = COMPILER_FILES_DIR_URL + compilerFileName;

      console.debug("Downloading compiler version " + this.version);

      try {
        const download = await import("download");
        await download(compilerUrl, this.compilersDir);
      } catch (error) {
        throw new BuidlerError(
          ERRORS.COMPILER_DOWNLOAD_FAILED,
          error,
          this.version,
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
    const fsExtra = await import("fs-extra");
    return fsExtra.pathExists(this.getCompilerListPath());
  }

  async getCompilerList() {
    if (!(await this.compilerListExists())) {
      await this.downloadVersionsList();
    }

    const fsExtra = await import("fs-extra");
    return fsExtra.readJson(this.getCompilerListPath());
  }

  async downloadVersionsList() {
    const fsExtra = await import("fs-extra");
    const download = await import("download");

    try {
      await fsExtra.ensureDir(this.compilersDir);
      await download(COMPILERS_LIST_URL, this.compilersDir);
    } catch (error) {
      throw new BuidlerError(
        ERRORS.COMPILER_VERSION_LIST_DOWNLOAD_FAILED,
        error,
        this.getLocalSolcVersion()
      );
    }
  }

  async validateCompiler(compilerPath, compilerFileName) {
    const fsExtra = await import("fs-extra");
    const ethereumjsUtil = await import("ethereumjs-util");

    const list = await this.getCompilerList();
    const compilerInfo = list.builds.filter(
      b => b.path === compilerFileName
    )[0];
    const expectedKeccak256 = compilerInfo.keccak256;

    const compiler = await fsExtra.readFile(compilerPath);

    const compilerKeccak256 =
      "0x" + ethereumjsUtil.keccak(compiler).toString("hex");

    if (expectedKeccak256 !== compilerKeccak256) {
      await fsExtra.unlink(compilerPath);

      throw new BuidlerError(
        ERRORS.COMPILER_INVALID_DOWNLOAD,
        this.version,
        this.getLocalSolcVersion()
      );
    }
  }
}
