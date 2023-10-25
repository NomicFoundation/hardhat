import debug from "debug";
import { VarsManager } from "./vars-manager";

const log = debug("hardhat:core:vars:varsManagerSetup");

// This class is ONLY used when collecting the required and optional vars that have to be filled by the user
export class VarsManagerSetup extends VarsManager {
  private readonly _requiredVarsAlreadySet: Set<string>;
  private readonly _optionalVarsAlreadySet: Set<string>;
  private readonly _requiredVarsToSet: Set<string>;
  private readonly _optionalVarsToSet: Set<string>;

  constructor(varsFilePath: string) {
    log("Creating a new instance of VarsManagerSetup");

    super(varsFilePath);

    this._requiredVarsAlreadySet = new Set();
    this._optionalVarsAlreadySet = new Set();

    this._requiredVarsToSet = new Set();
    this._optionalVarsToSet = new Set();
  }

  // During setup we ignore env variables, so this function is the same as 'has'
  public hasWithEnvVars(key: string): boolean {
    return this.has(key);
  }

  // During setup we ignore env variables, so this function is the same as 'get'
  public getWithEnvVars(
    key: string,
    defaultValue?: string | undefined
  ): string | undefined {
    return this.get(key, defaultValue);
  }

  // Checks if the key exists, and updates optional sets accordingly.
  // Required vars have priority over optional vars.
  public has(key: string): boolean {
    log(`function 'has' called with key '${key}'`);

    const hasKey = super.has(key);

    if (hasKey && !this._requiredVarsAlreadySet.has(key)) {
      this._optionalVarsAlreadySet.add(key);
    }

    if (!hasKey && !this._requiredVarsToSet.has(key)) {
      this._optionalVarsToSet.add(key);
    }

    return hasKey;
  }

  // Gets the value for the provided key, and updates required/optional sets accordingly.
  // Required vars have priority over optional vars.
  public get(key: string, defaultValue?: string): string {
    log(`function 'get' called with key '${key}'`);

    const value = super.get(key, defaultValue);

    if (value === undefined) {
      // Remove from optional vars (if it exists) and add to required vars.
      this._optionalVarsToSet.delete(key);
      this._requiredVarsToSet.add(key);

      // Do not return undefined to avoid throwing an error
      return "";
    }

    // Variable 'value' is defined so check if the key exists (and to related operations on optional vars) or if a default value was passed
    if (this.has(key)) {
      // The key exists so update the sets accordingly
      this._optionalVarsAlreadySet.delete(key);
      this._requiredVarsAlreadySet.add(key);
    }

    return value;
  }

  public getRequiredVarsAlreadySet(): string[] {
    return Array.from(this._requiredVarsAlreadySet);
  }

  public getOptionalVarsAlreadySet(): string[] {
    return Array.from(this._optionalVarsAlreadySet);
  }

  public getRequiredVarsToSet(): string[] {
    return Array.from(this._requiredVarsToSet);
  }

  public getOptionalVarsToSet(): string[] {
    return Array.from(this._optionalVarsToSet);
  }
}
