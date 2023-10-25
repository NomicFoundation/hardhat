import fs from "fs-extra";
import debug from "debug";
import { HardhatError } from "../errors";
import { ERRORS } from "../errors-list";

interface Var {
  value: string;
}

interface VarsFile {
  _format: string; // Version of the json vars file
  vars: Record<string, Var>;
}

const log = debug("hardhat:core:vars:varsManager");

export class VarsManager {
  private readonly _VERSION = "hh-vars-1";
  private readonly _ENV_VAR_PREFIX = "HARDHAT_VAR_";
  private readonly _cache: VarsFile;
  private readonly _cacheEnv: VarsFile;

  constructor(private readonly _varsFilePath: string) {
    log("Creating a new instance of VarsManager");

    this._initializeVarsFile();
    this._cache = fs.readJSONSync(this._varsFilePath);

    this._cacheEnv = this._getVarsFileStructure();
    this._loadVarsFromEnv();
  }

  public getStoragePath(): string {
    return this._varsFilePath;
  }

  public set(key: string, value: string) {
    this.validateKey(key);

    const vars = this._readVars();

    vars[key] = { value };
    this._writeVars(vars);
  }

  public has(key: string): boolean {
    return key in this._readVars();
  }

  public hasWithEnvVars(key: string): boolean {
    return key in this._readVars(true);
  }

  public get(key: string, defaultValue?: string): string | undefined {
    return this._readVars()[key]?.value ?? defaultValue;
  }

  public getWithEnvVars(
    key: string,
    defaultValue?: string
  ): string | undefined {
    return this._readVars(true)[key]?.value ?? defaultValue;
  }

  public getEnvVars(): string[] {
    return Object.keys(this._cacheEnv.vars);
  }

  public list(): string[] {
    return Object.keys(this._readVars());
  }

  public delete(key: string): boolean {
    const vars = this._readVars();

    if (vars[key] === undefined) return false;

    delete vars[key];
    this._writeVars(vars);

    return true;
  }

  public validateKey(key: string) {
    const KEY_REGEX = /^[a-zA-Z_]+[a-zA-Z0-9_]*$/;

    if (!KEY_REGEX.test(key)) {
      throw new HardhatError(ERRORS.VARS.INVALID_KEY_VALUE, {
        value: key,
      });
    }
  }

  private _initializeVarsFile() {
    if (!fs.pathExistsSync(this._varsFilePath)) {
      // Initialize the vars file if it does not exist
      log(
        `Vars file do not exist. Creating a new one at '${this._varsFilePath}' with version '${this._VERSION}'`
      );

      fs.writeJSONSync(this._varsFilePath, this._getVarsFileStructure(), {
        spaces: 2,
      });
    }
  }

  private _getVarsFileStructure(): VarsFile {
    return {
      _format: this._VERSION,
      vars: {},
    };
  }

  private _loadVarsFromEnv() {
    log("Loading ENV variables if any");

    for (const key in process.env) {
      if (key.startsWith(this._ENV_VAR_PREFIX)) {
        if (
          process.env[key] === undefined ||
          process.env[key]!.replace(/[\s\t]/g, "").length === 0
        ) {
          throw new HardhatError(ERRORS.ARGUMENTS.INVALID_ENV_VAR_VALUE, {
            varName: key,
            value: process.env[key]!,
          });
        }

        const envKey = key.replace(this._ENV_VAR_PREFIX, "");
        this.validateKey(envKey);

        // Store only in cache, not in a file, as the vars are sourced from environment variables
        this._cacheEnv.vars[envKey] = { value: process.env[key]! };
      }
    }
  }

  private _writeVars(vars: Record<string, Var>) {
    this._cache.vars = vars;
    fs.writeJSONSync(this._varsFilePath, this._cache, { spaces: 2 });
  }

  private _readVars(includeEnvs: boolean = false): Record<string, Var> {
    // Env vars have priority over stored vars, _cacheEnv will overwrite the _cache vars if the key is the same
    return includeEnvs
      ? { ...this._cache.vars, ...this._cacheEnv.vars }
      : this._cache.vars;
  }
}
