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
  private readonly _cache: SecretsFile;
  private readonly _version = "hh-secrets-1";

  constructor(private readonly _secretsFilePath: string) {
    this._initializeSecretsFile();
    this._cache = fs.readJSONSync(this._secretsFilePath);
  }

  public set(key: string, value: string) {
    const KEY_REGEX = /^[a-zA-Z_]+[a-zA-Z0-9_]*$/;

    if (!KEY_REGEX.test(key)) {
      throw new HardhatError(ERRORS.ARGUMENTS.INVALID_ARGUMENT_VALUE, {
        value: key,
        argument: "key",
        reason: `The argument should match the following regex expression: ${KEY_REGEX.toString()}`,
      });
    }

    const secrets = this._readSecrets();

    secrets[key] = { value };
    this._writeSecrets(secrets);
  }

  public get(key: string): string | undefined {
    if (key === undefined) {
      return;
    }

    const secrets = this._readSecrets();
    return secrets[key]?.value ?? undefined;
  }

  public list(): string[] {
    const secrets = this._readSecrets();
    return Object.keys(secrets);
  }

  public delete(key: string): boolean {
    const secrets = this._readSecrets();

    if (secrets[key] === undefined) return false;

    delete secrets[key];
    this._writeSecrets(secrets);

    return true;
  }

  private _initializeSecretsFile() {
    if (!fs.pathExistsSync(this._secretsFilePath)) {
      // Initialize the secrets file if it does not exist
      fs.writeJSONSync(
        this._secretsFilePath,
        {
          _format: this._version,
          secrets: {},
        },
        { spaces: 2 }
      );
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
