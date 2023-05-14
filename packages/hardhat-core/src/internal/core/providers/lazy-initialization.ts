import {
  EthereumProvider,
  JsonRpcRequest,
  JsonRpcResponse,
  RequestArguments,
  ProviderFactory,
} from "../../../types";

/**
 * A class that delays the (async) creation of its internal provider until the first call
 * to a JSON RPC method via request/send/sendAsync.
 * Trying to use the EventEmitter API without calling request first (initializing the provider)
 * will throw.
 */
export class LazyInitializationProvider implements EthereumProvider {
  protected provider: EthereumProvider | undefined;

  constructor(private providerFactory: ProviderFactory) {}

  // Provider methods

  public async request(args: RequestArguments): Promise<unknown> {
    const provider = await this.ensureProvider();
    return provider.request(args);
  }

  public async send(method: string, params?: any[]): Promise<any> {
    const provider = await this.ensureProvider();
    return provider.send(method, params);
  }

  public sendAsync(
    payload: JsonRpcRequest,
    callback: (error: any, response: JsonRpcResponse) => void
  ): void {
    this.ensureProvider().then((provider) => {
      provider.sendAsync(payload, callback);
    });
  }

  // EventEmitter methods

  public addListener(event: string | symbol, listener: EventListener): this {
    this.getProvider().addListener(event, listener);
    return this;
  }

  public on(event: string | symbol, listener: EventListener): this {
    this.getProvider().on(event, listener);
    return this;
  }

  public once(
    event: string | symbol,
    listener: (...args: any[]) => void
  ): this {
    this.getProvider().once(event, listener);
    return this;
  }

  public prependListener(
    event: string | symbol,
    listener: (...args: any[]) => void
  ): this {
    this.getProvider().prependListener(event, listener);
    return this;
  }

  public prependOnceListener(
    event: string | symbol,
    listener: (...args: any[]) => void
  ): this {
    this.getProvider().prependOnceListener(event, listener);
    return this;
  }

  public removeListener(
    event: string | symbol,
    listener: (...args: any[]) => void
  ): this {
    this.getProvider().removeListener(event, listener);
    return this;
  }

  public off(event: string | symbol, listener: (...args: any[]) => void): this {
    this.getProvider().off(event, listener);
    return this;
  }

  public removeAllListeners(event?: string | symbol | undefined): this {
    this.getProvider().removeAllListeners(event);
    return this;
  }

  public setMaxListeners(n: number): this {
    this.getProvider().setMaxListeners(n);
    return this;
  }

  public getMaxListeners(): number {
    return this.getProvider().getMaxListeners();
  }

  public listeners(event: string | symbol): Function[] {
    return this.getProvider().listeners(event);
  }

  public rawListeners(event: string | symbol): Function[] {
    return this.getProvider().rawListeners(event);
  }

  public emit(event: string | symbol, ...args: any[]): boolean {
    return this.getProvider().emit(event, ...args);
  }

  public eventNames(): Array<string | symbol> {
    return this.getProvider().eventNames();
  }

  public listenerCount(type: string | symbol): number {
    return this.getProvider().listenerCount(type);
  }

  private getProvider(): EthereumProvider {
    if (!this.provider) {
      throw new Error("You should've done something else");
    }
    return this.provider;
  }

  private async ensureProvider(): Promise<EthereumProvider> {
    if (!this.provider) {
      this.provider = await this.providerFactory();
    }
    return this.provider;
  }
}
