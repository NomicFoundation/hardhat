import {
  ConfigProvider,
  ExternalParamValue,
  HasParamResult,
  ModuleParams,
} from "@ignored/ignition-core";
import { IgnitionError } from "@ignored/ignition-core/helpers";

export class ConfigWrapper implements ConfigProvider {
  public parameters: ModuleParams | undefined;

  constructor() {
    this.parameters = undefined;
  }

  public async setParams(parameters: ModuleParams | undefined): Promise<void> {
    this.parameters = parameters;
  }

  public async getParam(paramName: string): Promise<ExternalParamValue> {
    if (this.parameters === undefined) {
      throw new IgnitionError(
        `No parameters object provided to deploy options, but module requires parameter "${paramName}"`
      );
    }

    return this.parameters[paramName];
  }

  public async hasParam(paramName: string): Promise<HasParamResult> {
    if (this.parameters === undefined) {
      return {
        found: false,
        errorCode: "no-params",
      };
    }

    const paramFound = paramName in this.parameters;

    return paramFound
      ? { found: true }
      : {
          found: false,
          errorCode: "param-missing",
        };
  }
}
