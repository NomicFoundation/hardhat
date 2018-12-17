import { IEthereumProvider } from "./ethereum";

export abstract class WrappedProvider implements IEthereumProvider {
  protected constructor(private readonly provider: IEthereumProvider) {}

  public addListener(
    event: string | symbol,
    listener: (...args: any[]) => void
  ): this {
    this.provider.addListener(event, listener);
    return this;
  }

  public eventNames(): Array<string | symbol> {
    return this.provider.eventNames();
  }

  public getMaxListeners(): number {
    return this.provider.getMaxListeners();
  }

  public listenerCount(type: string | symbol): number {
    return this.provider.listenerCount(type);
  }

  // tslint:disable-next-line ban-types
  public listeners(event: string | symbol): Function[] {
    return this.provider.listeners(event);
  }

  public on(
    type: string | symbol,
    listener: ((result: any) => void) | ((...args: any[]) => void)
  ): this {
    if (typeof type !== "string") {
      throw new Error("WrappedProvider.prototype.on doesn't support symbols");
    }

    this.provider.on(type, listener);

    return this;
  }

  public once(
    event: string | symbol,
    listener: (...args: any[]) => void
  ): this {
    this.provider.once(event, listener);
    return this;
  }

  public prependListener(
    event: string | symbol,
    listener: (...args: any[]) => void
  ): this {
    this.provider.prependListener(event, listener);
    return this;
  }

  public prependOnceListener(
    event: string | symbol,
    listener: (...args: any[]) => void
  ): this {
    this.provider.prependOnceListener(event, listener);
    return this;
  }

  public removeAllListeners(event?: string | symbol): this {
    this.provider.removeAllListeners(event);
    return this;
  }

  public removeListener(
    event: string | symbol,
    listener: (...args: any[]) => void
  ): this {
    this.provider.removeListener(event, listener);
    return this;
  }

  public send(method: string, params?: any[]): Promise<any> {
    return this.provider.send(method, params);
  }

  public setMaxListeners(n: number): this {
    this.provider.setMaxListeners(n);
    return this;
  }

  public emit(event: string | symbol, ...args: any[]): boolean {
    return this.provider.emit(event, args);
  }
}
