import { ExternalParamValue } from "../types/deploymentGraph";
import { HasParamResult, Providers } from "../types/providers";

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
