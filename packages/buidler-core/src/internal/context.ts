import { BuidlerRuntimeEnvironment, ConfigExtender } from "../types";

import { ExtenderManager } from "./core/config/extenders";
import { BuidlerError } from "./core/errors";
import { ERRORS } from "./core/errors-list";
import { TasksDSL } from "./core/tasks/dsl";
import { GlobalWithBuidlerContext } from "./internalTypes";

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
}
