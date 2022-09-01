import { HasParamResult, Providers } from "../providers";
import { ParamValue } from "../recipes/types";

export interface IConfigService {
  getParam(paramName: string): Promise<ParamValue>;

  hasParam(paramName: string): Promise<HasParamResult>;
}

export class ConfigService implements IConfigService {
  constructor(private readonly _providers: Providers) {}

  public getParam(paramName: string): Promise<ParamValue> {
    return this._providers.config.getParam(paramName);
  }

  public hasParam(paramName: string): Promise<HasParamResult> {
    return this._providers.config.hasParam(paramName);
  }
}
