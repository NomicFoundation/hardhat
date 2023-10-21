import fs from "fs-extra";
import { HardhatError } from "../errors";
import { ERRORS } from "../errors-list";

interface Var {
  value: string;
}

interface VarsFile {
  _format: string; // Version of the json vars file
  vars: Record<string, Var>;
}

export class VarsManager {
  private readonly _VERSION = "hh-vars-1";
  private readonly _ENV_VAR_PREFIX = "HARDHAT_VAR_";
  private readonly _cache: VarsFile;

  constructor(private readonly _varsFilePath: string) {
    this._initializeVarsFile();
    this._cache = fs.readJSONSync(this._varsFilePath);
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

  public get(key: string, defaultValue?: string): string | undefined {
    return this._readVars()[key]?.value ?? defaultValue;
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
      fs.writeJSONSync(
        this._varsFilePath,
        {
          _format: this._VERSION,
          vars: {},
        },
        { spaces: 2 }
      );
    }
  }

  private _loadVarsFromEnv() {
    const vars = this._readVars();

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

        const managerKey = key.replace(this._ENV_VAR_PREFIX, "");
        this.validateKey(managerKey);
        vars[managerKey] = { value: process.env[key]! };

        // Store only in cache, not in a file, as the vars are sourced from environment variables
        this._cache.vars = vars;
      }
    }
  }

  private _writeVars(vars: Record<string, Var>) {
    this._cache.vars = vars;
    fs.writeJSONSync(this._varsFilePath, this._cache, { spaces: 2 });
  }

  private _readVars(): Record<string, Var> {
    return this._cache.vars;
  }
}
