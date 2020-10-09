import {
  ConfigExtender,
  ExperimentalHardhatNetworkMessageTraceHook,
  HardhatRuntimeEnvironment,
} from "../types";

import { ExtenderManager } from "./core/config/extenders";
import { HardhatError } from "./core/errors";
import { ERRORS } from "./core/errors-list";
import { TasksDSL } from "./core/tasks/dsl";

export type GlobalWithHardhatContext = NodeJS.Global & {
  __hardhatContext: HardhatContext;
};

export class HardhatContext {
  public static isCreated(): boolean {
    const globalWithHardhatContext = global as GlobalWithHardhatContext;
    return globalWithHardhatContext.__hardhatContext !== undefined;
  }

  public static createHardhatContext(): HardhatContext {
    if (this.isCreated()) {
      throw new HardhatError(ERRORS.GENERAL.CONTEXT_ALREADY_CREATED);
    }
    const globalWithHardhatContext = global as GlobalWithHardhatContext;
    const ctx = new HardhatContext();
    globalWithHardhatContext.__hardhatContext = ctx;
    return ctx;
  }

  public static getHardhatContext(): HardhatContext {
    const globalWithHardhatContext = global as GlobalWithHardhatContext;
    const ctx = globalWithHardhatContext.__hardhatContext;
    if (ctx === undefined) {
      throw new HardhatError(ERRORS.GENERAL.CONTEXT_NOT_CREATED);
    }
    return ctx;
  }

  public static deleteHardhatContext() {
    const globalAsAny = global as any;
    globalAsAny.__hardhatContext = undefined;
  }

  public readonly tasksDSL = new TasksDSL();
  public readonly extendersManager = new ExtenderManager();
  public environment?: HardhatRuntimeEnvironment;
  public readonly loadedPlugins: string[] = [];
  public readonly configExtenders: ConfigExtender[] = [];

  // NOTE: This is experimental and will be removed. Please contact our team if
  // you are planning to use it.
  public readonly experimentalHardhatNetworkMessageTraceHooks: ExperimentalHardhatNetworkMessageTraceHook[] = [];

  private _configPath?: string;

  public setHardhatRuntimeEnvironment(env: HardhatRuntimeEnvironment) {
    if (this.environment !== undefined) {
      throw new HardhatError(ERRORS.GENERAL.CONTEXT_HRE_ALREADY_DEFINED);
    }
    this.environment = env;
  }

  public getHardhatRuntimeEnvironment(): HardhatRuntimeEnvironment {
    if (this.environment === undefined) {
      throw new HardhatError(ERRORS.GENERAL.CONTEXT_HRE_NOT_DEFINED);
    }
    return this.environment;
  }

  public setPluginAsLoaded(pluginName: string) {
    this.loadedPlugins.push(pluginName);
  }

  public setConfigPath(configPath: string) {
    this._configPath = configPath;
  }

  public getConfigPath(): string {
    if (this._configPath === undefined) {
      throw new HardhatError(ERRORS.GENERAL.CONTEXT_CONFIG_PATH_NOT_SET);
    }

    return this._configPath;
  }
}
