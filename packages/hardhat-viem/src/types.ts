import type {
  Account,
  Chain,
  PublicClient,
  TestClient,
  Transport,
  WalletClient,
} from "viem";
import type { TestClientMode } from "viem/dist/types/clients/createTestClient";

export type HardhatViemPublicClient = PublicClient<Transport, Chain>;
export type HardhatViemWalletClients = Array<
  WalletClient<Transport, Chain, Account>
>;
export type HardhatViemTestClient = TestClient<
  TestClientMode,
  Transport,
  Chain
>;
