import { EIP1193Provider } from "../provider";

export interface JsonRpcServer {
  getProvider(name: string): EIP1193Provider;

  listen(): Promise<{ address: string; port: number }>;
  waitUntilClosed(): Promise<void>;

  close(): Promise<void>;
}
