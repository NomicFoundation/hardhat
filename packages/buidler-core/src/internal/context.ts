import {
  BuidlerRuntimeEnvironment,
  ConfigExtender,
  ExperimentalBuidlerEVMMessageTraceHook,
} from "../types";

import { ExtenderManager } from "./core/config/extenders";
import { BuidlerError } from "./core/errors";
import { ERRORS } from "./core/errors-list";
import { TasksDSL } from "./core/tasks/dsl";

export type GlobalWithBuidlerContext = NodeJS.Global & {
  __buidlerContext: BuidlerContext;
};

export class BuidlerContext {
  public static isCreated(): boolean {
    const globalWithBuidlerContext = global as GlobalWithBuidlerContext;
    return globalWithBuidlerContext.__buidlerContext !== undefined;
  }

  public static createBuidlerContext(): BuidlerContext {
    if (this.isCreated()) {
      throw new BuidlerError(ERRORS.GENERAL.CONTEXT_ALREADY_CREATED);
    }
    const globalWithBuidlerContext = global as GlobalWithBuidlerContext;
    const ctx = new BuidlerContext();
    globalWithBuidlerContext.__buidlerContext = ctx;
    return ctx;
  }

  public static getBuidlerContext(): BuidlerContext {
    const globalWithBuidlerContext = global as GlobalWithBuidlerContext;
    const ctx = globalWithBuidlerContext.__buidlerContext;
    if (ctx === undefined) {
      throw new BuidlerError(ERRORS.GENERAL.CONTEXT_NOT_CREATED);
    }
    return ctx;
  }

  public static deleteBuidlerContext() {
    const globalAsAny = global as any;
    globalAsAny.__buidlerContext = undefined;
  }

  public readonly tasksDSL = new TasksDSL();
  public readonly extendersManager = new ExtenderManager();
  public environment?: BuidlerRuntimeEnvironment;
  public readonly loadedPlugins: string[] = [];
  public readonly configExtenders: ConfigExtender[] = [];

  // NOTE: This is experimental and will be removed. Please contact our team if
  // you are planning to use it.
  public readonly experimentalBuidlerEVMMessageTraceHooks: ExperimentalBuidlerEVMMessageTraceHook[] = [];

  private _configPath?: string;

  public setBuidlerRuntimeEnvironment(env: BuidlerRuntimeEnvironment) {
    if (this.environment !== undefined) {
      throw new BuidlerError(ERRORS.GENERAL.CONTEXT_BRE_ALREADY_DEFINED);
    }
    this.environment = env;
  }

  public getBuidlerRuntimeEnvironment(): BuidlerRuntimeEnvironment {
    if (this.environment === undefined) {
      throw new BuidlerError(ERRORS.GENERAL.CONTEXT_BRE_NOT_DEFINED);
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
      throw new BuidlerError(ERRORS.GENERAL.CONTEXT_CONFIG_PATH_NOT_SET);
    }

    return this._configPath;
  }
}
