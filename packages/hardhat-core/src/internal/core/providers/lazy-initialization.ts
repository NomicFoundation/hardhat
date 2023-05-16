import {
  EthereumProvider,
  JsonRpcRequest,
  JsonRpcResponse,
  RequestArguments,
  ProviderFactory,
} from "../../../types";
import { CustomError } from "../errors";

/**
 * A class that delays the (async) creation of its internal provider until the first call
 * to a JSON RPC method via request/send/sendAsync.
 * Trying to use the EventEmitter API without calling request first (initializing the provider)
 * will throw.
 */
export class LazyInitializationProvider implements EthereumProvider {
  protected provider: EthereumProvider | undefined;

  constructor(private _providerFactory: ProviderFactory) {}

  // Provider methods

  public async request(args: RequestArguments): Promise<unknown> {
    await this._initProvider();
    const provider = this._getProvider();
    return provider.request(args);
  }

  public async send(method: string, params?: any[]): Promise<any> {
    await this._initProvider();
    const provider = this._getProvider();
    return provider.send(method, params);
  }

  public sendAsync(
    payload: JsonRpcRequest,
    callback: (error: any, response: JsonRpcResponse) => void
  ): void {
    this._initProvider().then(() => {
      const provider = this._getProvider();
      provider.sendAsync(payload, callback);
    });
  }

  // EventEmitter methods

  public addListener(event: string | symbol, listener: EventListener): this {
    this._getProvider().addListener(event, listener);
    return this;
  }

  public on(event: string | symbol, listener: EventListener): this {
    this._getProvider().on(event, listener);
    return this;
  }

  public once(
    event: string | symbol,
    listener: (...args: any[]) => void
  ): this {
    this._getProvider().once(event, listener);
    return this;
  }

  public prependListener(
    event: string | symbol,
    listener: (...args: any[]) => void
  ): this {
    this._getProvider().prependListener(event, listener);
    return this;
  }

  public prependOnceListener(
    event: string | symbol,
    listener: (...args: any[]) => void
  ): this {
    this._getProvider().prependOnceListener(event, listener);
    return this;
  }

  public removeListener(
    event: string | symbol,
    listener: (...args: any[]) => void
  ): this {
    this._getProvider().removeListener(event, listener);
    return this;
  }

  public off(event: string | symbol, listener: (...args: any[]) => void): this {
    this._getProvider().off(event, listener);
    return this;
  }

  public removeAllListeners(event?: string | symbol | undefined): this {
    this._getProvider().removeAllListeners(event);
    return this;
  }

  public setMaxListeners(n: number): this {
    this._getProvider().setMaxListeners(n);
    return this;
  }

  public getMaxListeners(): number {
    return this._getProvider().getMaxListeners();
  }

  public listeners(event: string | symbol): Function[] {
    return this._getProvider().listeners(event);
  }

  public rawListeners(event: string | symbol): Function[] {
    return this._getProvider().rawListeners(event);
  }

  public emit(event: string | symbol, ...args: any[]): boolean {
    return this._getProvider().emit(event, ...args);
  }

  public eventNames(): Array<string | symbol> {
    return this._getProvider().eventNames();
  }

  public listenerCount(type: string | symbol): number {
    return this._getProvider().listenerCount(type);
  }

  private _getProvider(): EthereumProvider {
    if (!this.provider) {
      throw new UninitializedProviderError();
    }
    return this.provider;
  }

  private async _initProvider(): Promise<void> {
    if (!this.provider) {
      this.provider = await this._providerFactory();
    }
  }
}

export class UninitializedProviderError extends CustomError {
  constructor() {
    super(`You tried to access an uninitialized provider.
To initialize the provider, make sure you first call any method that hits a node like request, send or sendAsync.`);
  }
}
