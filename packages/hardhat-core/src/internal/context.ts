import {
  ConfigExtender,
  ExperimentalHardhatNetworkMessageTraceHook,
  HardhatRuntimeEnvironment,
} from "../types";

import { ExtenderManager } from "./core/config/extenders";
import { assertHardhatInvariant, HardhatError } from "./core/errors";
import { ERRORS } from "./core/errors-list";
import { TasksDSL } from "./core/tasks/dsl";
import { getRequireCachedFiles } from "./util/platform";

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
  public readonly configExtenders: ConfigExtender[] = [];

  // NOTE: This is experimental and will be removed. Please contact our team if
  // you are planning to use it.
  public readonly experimentalHardhatNetworkMessageTraceHooks: ExperimentalHardhatNetworkMessageTraceHook[] =
    [];
  private _filesLoadedBeforeConfig?: string[];
  private _filesLoadedAfterConfig?: string[];

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

  public setConfigLoadingAsStarted() {
    this._filesLoadedBeforeConfig = getRequireCachedFiles();
  }

  public setConfigLoadingAsFinished() {
    this._filesLoadedAfterConfig = getRequireCachedFiles();
  }

  public getFilesLoadedDuringConfig(): string[] {
    // No config was loaded
    if (this._filesLoadedBeforeConfig === undefined) {
      return [];
    }

    assertHardhatInvariant(
      this._filesLoadedAfterConfig !== undefined,
      "Config loading was set as started and not finished"
    );

    return arraysDifference(
      this._filesLoadedAfterConfig,
      this._filesLoadedBeforeConfig
    );
  }
}

function arraysDifference<T>(a: T[], b: T[]): T[] {
  return a.filter((e) => !b.includes(e));
}
