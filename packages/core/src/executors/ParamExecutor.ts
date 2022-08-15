import { ParamOptions } from "../futures/types";
import { Services } from "../services/types";

import { Executor } from "./Executor";

export class ParamExecutor extends Executor<ParamOptions, any> {
  public async execute(
    { paramName, defaultValue }: ParamOptions,
    services: Services
  ): Promise<any> {
    const hasParamResult = await services.config.hasParam(paramName);

    if (defaultValue !== undefined) {
      if (hasParamResult.found) {
        return services.config.getParam(paramName);
      } else {
        return defaultValue;
      }
    }

    return services.config.getParam(paramName);
  }

  public async validate(
    { paramName, defaultValue }: ParamOptions,
    services: Services
  ): Promise<string[]> {
    const hasParamResult = await services.config.hasParam(paramName);

    if (defaultValue !== undefined) {
      return [];
    }

    if (!hasParamResult.found && hasParamResult.errorCode === "no-params") {
      return [
        `No parameters object provided to deploy options, but module requires parameter "${paramName}"`,
      ];
    }

    if (!hasParamResult.found && hasParamResult.errorCode === "param-missing") {
      return [`No parameter provided for "${paramName}"`];
    }

    if (!hasParamResult.found) {
      return ["Unexpected state during lookup"];
    }

    return [];
  }

  public getDescription(): string {
    return `Read param ${this.future.input.paramName}`;
  }
}
