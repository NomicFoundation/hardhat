import type {
  ConfigProvider,
  ExternalParamValue,
  HasParamResult,
} from "@ignored/ignition-core";

export class ConfigWrapper implements ConfigProvider {
  private parameters: { [key: string]: ExternalParamValue } | undefined;

  constructor() {
    this.parameters = undefined;
  }

  public async setParams(
    parameters:
      | {
          [key: string]: ExternalParamValue;
        }
      | undefined
  ): Promise<void> {
    this.parameters = parameters;
  }

  public async getParam(paramName: string): Promise<ExternalParamValue> {
    if (this.parameters === undefined) {
      throw new Error(
        `No parameters object provided to deploy options, but recipe requires parameter "${paramName}"`
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
