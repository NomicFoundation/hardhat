import chalk from "chalk";
import fs from "fs-extra";

export class SecretsManager {
  constructor(private readonly _secretsFilePath: string) {}

  public set(secretName: string, secretValue: string) {
    if (secretName === undefined || secretValue === undefined) {
      console.log(chalk.yellow("You must provide a key and a secret"));
      return;
    }

    const secrets = this._readSecrets();

    secrets[secretName] = secretValue;
    this._writeSecrets(secrets);

    console.log(`The secret has been stored with the key ${secretName}`);
  }

  public get(secretName: string): string | undefined {
    if (secretName === undefined) {
      console.log(chalk.yellow("You must provide the secret key"));
      return;
    }

    const secrets = this._readSecrets();

    if (!this._areSecretsStored(secrets)) return;
    if (!this._doesSecretExist(secrets, secretName)) return;

    // TODO: remove this console.log
    console.log(`${secretName}: ${secrets[secretName]}`);

    return secrets[secretName];
  }

  public list() {
    const secrets = this._readSecrets();
    if (!this._areSecretsStored(secrets)) return;

    Object.keys(secrets).forEach((key) => {
      console.log(key);
    });
  }

  public delete(secretName: string) {
    if (secretName === undefined) {
      console.log(chalk.yellow("You must provide the secret key"));
      return;
    }

    const secrets = this._readSecrets();
    if (!this._areSecretsStored(secrets)) return;
    if (!this._doesSecretExist(secrets, secretName)) return;

    delete secrets[secretName];
    this._writeSecrets(secrets);

    console.log(
      `The secret associated to the key ${secretName} has been deleted`
    );
  }

  private _writeSecrets(secrets: any) {
    const secretsPath = this._secretsFilePath;
    fs.writeJSONSync(secretsPath, secrets, { spaces: 2 });
  }

  private _readSecrets(): Record<string, string> {
    return fs.pathExistsSync(this._secretsFilePath)
      ? fs.readJSONSync(this._secretsFilePath)
      : {};
  }

  private _areSecretsStored(secretsObj: Record<string, string>): boolean {
    if (Object.keys(secretsObj).length > 0) return true;

    console.log(
      chalk.red("There are no secrets stored in the secret manager.")
    );

    return false;
  }

  private _doesSecretExist(secretsObj: any, key: string) {
    if (secretsObj[key] !== undefined) return true;

    console.log(chalk.red(`There is no secret associated to the key ${key}`));

    return false;
  }
}
