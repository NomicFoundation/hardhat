import { SecretsManager } from "./secrets-manager";

// This class is ONLY used when collecting the required and optional secrets that have to be filled by the user
export class SecretsManagerSetup extends SecretsManager {
  private readonly _requiredSecrets: Set<string>;
  private readonly _optionalSecrets: Set<string>;

  constructor(secretsFilePath: string) {
    super(secretsFilePath);
    this._requiredSecrets = new Set();
    this._optionalSecrets = new Set();
  }

  public has(key: string): boolean {
    if (super.has(key)) return true;

    // Only add if the key is not already in the required secrets.
    // Required secrets have priority over optional secrets
    if (!this._requiredSecrets.has(key)) this._optionalSecrets.add(key);

    return false;
  }

  public get(key: string, defaultValue?: string): string {
    const value = super.get(key, defaultValue);

    if (value === undefined) {
      // The key is not present and there is no default value.
      // Remove from optional secrets (if it exists) and add to required secrets.
      // Required secrets have priority over optional secrets.
      if (this._optionalSecrets.has(key)) this._optionalSecrets.delete(key);
      this._requiredSecrets.add(key);

      // Do not return undefined to avoid throwing an error
      return "";
    }

    // Call to check if key exists and to add to optional secrets if necessary
    this.has(key);

    return value;
  }

  public getOptionalSecretsKeys(): string[] {
    return Array.from(this._optionalSecrets);
  }

  public getRequiredSecretsKeys(): string[] {
    return Array.from(this._requiredSecrets);
  }
}
