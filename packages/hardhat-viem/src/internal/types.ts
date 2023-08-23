import type * as viemTypes from "viem";
import type { TestClientMode } from "viem/src/clients/createTestClient";

export type PublicClient = viemTypes.PublicClient<
  viemTypes.Transport,
  viemTypes.Chain
>;
export type WalletClient = viemTypes.WalletClient<
  viemTypes.Transport,
  viemTypes.Chain,
  viemTypes.Account
>;
export type TestClient = viemTypes.TestClient<
  TestClientMode,
  viemTypes.Transport,
  viemTypes.Chain
>;
