import type { RawInterruptions } from "../types.js";

import { HardhatPluginError } from "@ignored/hardhat-vnext-errors";

import { PLUGIN_ID } from "../constants.js";

export class HookRawInterruptionsImpl implements RawInterruptions {
  public async displayNoKeystoreSetErrorMessage(): Promise<void> {
    throw new HardhatPluginError(PLUGIN_ID, "this should not be called");
  }

  public async displayKeyNotFoundErrorMessage(_key: string): Promise<void> {
    throw new HardhatPluginError(PLUGIN_ID, "this should not be called");
  }

  public async displayKeyRemovedInfoMessage(_key: string): Promise<void> {
    throw new HardhatPluginError(PLUGIN_ID, "this should not be called");
  }

  public async displayValueInfoMessage(_value: string): Promise<void> {
    throw new HardhatPluginError(PLUGIN_ID, "this should not be called");
  }

  public async displayNoKeysInfoMessage(): Promise<void> {
    throw new HardhatPluginError(PLUGIN_ID, "this should not be called");
  }

  public async displayKeyListInfoMessage(_keys: string[]): Promise<void> {
    throw new HardhatPluginError(PLUGIN_ID, "this should not be called");
  }

  public async displayInvalidKeyErrorMessage(_key: string): Promise<void> {
    throw new HardhatPluginError(PLUGIN_ID, "this should not be called");
  }

  public async displayKeyAlreadyExistsWarning(_key: string): Promise<void> {
    throw new HardhatPluginError(PLUGIN_ID, "this should not be called");
  }

  public async displaySecretCannotBeEmptyErrorMessage(): Promise<void> {
    throw new HardhatPluginError(PLUGIN_ID, "this should not be called");
  }

  public async displayKeySetInfoMessage(_key: string): Promise<void> {
    throw new HardhatPluginError(PLUGIN_ID, "this should not be called");
  }

  public async requestSecretFromUser(): Promise<string> {
    throw new HardhatPluginError(PLUGIN_ID, "this should not be called");
  }

  public async setUpPassword(): Promise<void> {
    throw new HardhatPluginError(PLUGIN_ID, "this should not be called");
  }
}
