import { HasParamResult, Providers } from "../providers";
import { ExternalParamValue } from "../single-graph/types/recipeGraph";

export interface IConfigService {
  getParam(paramName: string): Promise<ExternalParamValue>;

  hasParam(paramName: string): Promise<HasParamResult>;
}

export class ConfigService implements IConfigService {
  constructor(private readonly _providers: Providers) {}

  public getParam(paramName: string): Promise<ExternalParamValue> {
    return this._providers.config.getParam(paramName);
  }

  public hasParam(paramName: string): Promise<HasParamResult> {
    return this._providers.config.hasParam(paramName);
  }
}
