import { ParamValue } from "../modules/types";
import { HasParamResult, Providers } from "../providers";

export class ConfigService {
  constructor(private readonly _providers: Providers) {}

  public getParam(paramName: string): Promise<ParamValue> {
    return this._providers.config.getParam(paramName);
  }

  public hasParam(paramName: string): Promise<HasParamResult> {
    return this._providers.config.hasParam(paramName);
  }
}
