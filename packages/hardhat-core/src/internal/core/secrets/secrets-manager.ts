import fs from "fs-extra";
import { HardhatError } from "../errors";
import { ERRORS } from "../errors-list";

interface Secret {
  value: string;
}

interface SecretsFile {
  _format: string; // Version of the json secrets file
  secrets: Record<string, Secret>;
}

export class SecretsManager {
  private readonly _VERSION = "hh-secrets-1";
  private readonly _ENV_VAR_PREFIX = "HARDHAT_SECRET_";
  private readonly _cache: SecretsFile;

  constructor(private readonly _secretsFilePath: string) {
    this._initializeSecretsFile();
    this._cache = fs.readJSONSync(this._secretsFilePath);
    this._loadSecretsFromEnv();
  }

  public getStoragePath(): string {
    return this._secretsFilePath;
  }

  public set(key: string, value: string) {
    this.validateKey(key);

    const secrets = this._readSecrets();

    secrets[key] = { value };
    this._writeSecrets(secrets);
  }

  public has(key: string): boolean {
    return key in this._readSecrets();
  }

  public get(key: string, defaultValue?: string): string | undefined {
    return this._readSecrets()[key]?.value ?? defaultValue;
  }

  public list(): string[] {
    return Object.keys(this._readSecrets());
  }

  public delete(key: string): boolean {
    const secrets = this._readSecrets();

    if (secrets[key] === undefined) return false;

    delete secrets[key];
    this._writeSecrets(secrets);

    return true;
  }

  public validateKey(key: string) {
    const KEY_REGEX = /^[a-zA-Z_]+[a-zA-Z0-9_]*$/;

    if (!KEY_REGEX.test(key)) {
      throw new HardhatError(ERRORS.SECRETS.INVALID_KEY_VALUE, {
        value: key,
      });
    }
  }

  private _initializeSecretsFile() {
    if (!fs.pathExistsSync(this._secretsFilePath)) {
      // Initialize the secrets file if it does not exist
      fs.writeJSONSync(
        this._secretsFilePath,
        {
          _format: this._VERSION,
          secrets: {},
        },
        { spaces: 2 }
      );
    }
  }

  private _loadSecretsFromEnv() {
    const secrets = this._readSecrets();

    for (const key in process.env) {
      if (key.startsWith(this._ENV_VAR_PREFIX)) {
        if (process.env[key] === undefined) {
          throw new HardhatError(ERRORS.ARGUMENTS.INVALID_ENV_VAR_VALUE, {
            varName: key,
            value: process.env[key] ?? "undefined",
          });
        }

        const managerKey = key.replace(this._ENV_VAR_PREFIX, "");
        this.validateKey(managerKey);
        secrets[managerKey] = { value: process.env[key]! };

        // Store only in cache, not in a file, as the secrets are sourced from environment variables
        this._cache.secrets = secrets;
      }
    }
  }

  private _writeSecrets(secrets: Record<string, Secret>) {
    this._cache.secrets = secrets;
    fs.writeJSONSync(this._secretsFilePath, this._cache, { spaces: 2 });
  }

  private _readSecrets(): Record<string, Secret> {
    return this._cache.secrets;
  }
}
