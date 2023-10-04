import chalk from "chalk";
import fs from "fs-extra";
import { HardhatError } from "../errors";
import { ERRORS } from "../errors-list";

export class SecretsManager {
  private _cache: Record<string, string> | undefined = undefined;

  constructor(private readonly _secretsFilePath: string) {}

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

    secrets[key] = value;
    this._writeSecrets(secrets);
  }

  public get(key: string): string | undefined {
    if (key === undefined) {
      console.log(chalk.yellow("You must provide the secret key"));
      return;
    }

    const secrets = this._readSecrets();
    return secrets[key];
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

  private _writeSecrets(secrets: any) {
    const secretsPath = this._secretsFilePath;
    fs.writeJSONSync(secretsPath, secrets, { spaces: 2 });
    this._cache = secrets;
  }

  private _readSecrets(): Record<string, string> {
    if (this._cache !== undefined) return this._cache;

    this._cache = fs.pathExistsSync(this._secretsFilePath)
      ? fs.readJSONSync(this._secretsFilePath)
      : {};

    return this._cache!;
  }
}
