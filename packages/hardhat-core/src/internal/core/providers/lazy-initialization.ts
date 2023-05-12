import {
  EthereumProvider,
  JsonRpcRequest,
  JsonRpcResponse,
  RequestArguments,
} from "../../../types";
import { EventEmitterWrapper } from "../../util/event-emitter";

// TODO: Move this to types.ts
type ProviderFactory = () => Promise<EthereumProvider>;

/**
 * TODO: Explain this with some documentation
 */
export class LazyInitializationProvider
  extends EventEmitterWrapper
  implements EthereumProvider
{
  protected provider: EthereumProvider | undefined;

  constructor(private providerFactory: ProviderFactory) {
    // TODO: Explain what's going on here
    super(undefined as any);
  }

  // Provider methods

  public async request(args: RequestArguments): Promise<unknown> {
    const provider = await this.getProvider();
    return provider.request(args);
  }

  public async send(method: string, params?: any[]): Promise<any> {
    const provider = await this.getProvider();
    return provider.send(method, params);
  }

  public sendAsync(
    payload: JsonRpcRequest,
    callback: (error: any, response: JsonRpcResponse) => void
  ): void {
    this.getProvider().then((provider) => {
      provider.sendAsync(payload, callback);
    });
  }

  // EventEmitter methods

  // TODO: Maybe add a decorator-esque wrapper to avoid repetition

  public addListener(event: string | symbol, listener: EventListener): this {
    if (!this.provider) throw new UninitializedProviderError();
    this.provider.addListener(event, listener);
    return this;
  }

  public on(event: string | symbol, listener: EventListener): this {
    if (!this.provider) throw new UninitializedProviderError();
    this.provider.on(event, listener);
    return this;
  }

  public once(
    event: string | symbol,
    listener: (...args: any[]) => void
  ): this {
    if (!this.provider) throw new UninitializedProviderError();
    this.provider.once(event, listener);
    return this;
  }

  public prependListener(
    event: string | symbol,
    listener: (...args: any[]) => void
  ): this {
    if (!this.provider) throw new UninitializedProviderError();
    this.provider.prependListener(event, listener);
    return this;
  }

  public prependOnceListener(
    event: string | symbol,
    listener: (...args: any[]) => void
  ): this {
    if (!this.provider) throw new UninitializedProviderError();
    this.provider.prependOnceListener(event, listener);
    return this;
  }

  public removeListener(
    event: string | symbol,
    listener: (...args: any[]) => void
  ): this {
    if (!this.provider) throw new UninitializedProviderError();
    this.provider.removeListener(event, listener);
    return this;
  }

  public off(event: string | symbol, listener: (...args: any[]) => void): this {
    if (!this.provider) throw new UninitializedProviderError();
    this.provider.off(event, listener);
    return this;
  }

  public removeAllListeners(event?: string | symbol | undefined): this {
    if (!this.provider) throw new UninitializedProviderError();
    this.provider.removeAllListeners(event);
    return this;
  }

  public setMaxListeners(n: number): this {
    if (!this.provider) throw new UninitializedProviderError();
    this.provider.setMaxListeners(n);
    return this;
  }

  public getMaxListeners(): number {
    if (!this.provider) throw new UninitializedProviderError();
    return this.provider.getMaxListeners();
  }

  public listeners(event: string | symbol): Function[] {
    if (!this.provider) throw new UninitializedProviderError();
    return this.provider.listeners(event);
  }

  public rawListeners(event: string | symbol): Function[] {
    if (!this.provider) throw new UninitializedProviderError();
    return this.provider.rawListeners(event);
  }

  public emit(event: string | symbol, ...args: any[]): boolean {
    if (!this.provider) throw new UninitializedProviderError();
    return this.provider.emit(event, ...args);
  }

  public eventNames(): Array<string | symbol> {
    if (!this.provider) throw new UninitializedProviderError();
    return this.provider.eventNames();
  }

  public listenerCount(type: string | symbol): number {
    if (!this.provider) throw new UninitializedProviderError();
    return this.provider.listenerCount(type);
  }

  private async getProvider(): Promise<EthereumProvider> {
    if (!this.provider) {
      this.provider = await this.providerFactory();
    }
    return this.provider;
  }
}

// TODO: Is this necessary? we could just use Error
export class UninitializedProviderError extends Error {
  constructor() {
    // TODO: Better error message
    super("You need to call request first");
  }
}
