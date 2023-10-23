import debug from "debug";
import { VarsManager } from "./vars-manager";

const log = debug("hardhat:core:vars:varsManagerSetup");

// This class is ONLY used when collecting the required and optional vars that have to be filled by the user
export class VarsManagerSetup extends VarsManager {
  private readonly _requiredVars: Set<string>;
  private readonly _optionalVars: Set<string>;

  constructor(varsFilePath: string) {
    log("Creating a new instance of VarsManagerSetup");

    super(varsFilePath);
    this._requiredVars = new Set();
    this._optionalVars = new Set();
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

    if (super.has(key)) return true;

    if (!this._requiredVars.has(key)) this._optionalVars.add(key);

    return false;
  }

  // Gets the value for the provided key, and updates required/optional sets accordingly.
  // Required vars have priority over optional vars.
  public get(key: string, defaultValue?: string): string {
    log(`function 'get' called with key '${key}'`);

    const value = super.get(key, defaultValue);

    if (value === undefined) {
      // The key is not present and there is no default value.
      // Remove from optional vars (if it exists) and add to required vars.
      if (this._optionalVars.has(key)) this._optionalVars.delete(key);
      this._requiredVars.add(key);

      // Do not return undefined to avoid throwing an error
      return "";
    }

    // Call to check if key exists and to add to optional vars if necessary
    this.has(key);

    return value;
  }

  public getOptionalVarsKeys(): string[] {
    return Array.from(this._optionalVars);
  }

  public getRequiredVarsKeys(): string[] {
    return Array.from(this._requiredVars);
  }
}
