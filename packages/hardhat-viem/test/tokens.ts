import type { ResolvedToken, Token, Tokens } from "../src/types.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { expectTypeOf } from "expect-type";
import { defineToken, usdc } from "viem/tokens";

import {
  getPublicClient,
  getWalletClient,
  getWalletClients,
} from "../src/internal/clients.js";

import { MockEthereumProvider } from "./utils.js";

describe("tokens", () => {
  const sampleToken = defineToken({
    addresses: {
      1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      10: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    },
    currency: "USD",
    decimals: 6,
    symbol: "USDC",
    name: "USD Coin",
    popular: true,
  });

  it("should expose Token, Tokens, and ResolvedToken types", () => {
    expectTypeOf(sampleToken).toMatchTypeOf<Token>();
    expectTypeOf(usdc).toMatchTypeOf<Token>();

    const tokensList: Tokens = [sampleToken, usdc];
    expectTypeOf(tokensList).toMatchTypeOf<Tokens>();

    const resolved: ResolvedToken = sampleToken(1);
    assert.equal(
      resolved.address,
      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    );
    assert.equal(resolved.decimals, 6);
    assert.equal(resolved.symbol, "USDC");
    assert.equal(resolved.name, "USD Coin");
  });

  it("should allow configuring tokens on public client", async () => {
    const provider = new MockEthereumProvider({ eth_chainId: "0x1" });
    const client = await getPublicClient(provider, "l1", new Map(), "mainnet", {
      tokens: [sampleToken],
    });

    assert.equal(client.tokens?.length, 1);
    assert.equal(client.tokens?.[0]?.symbol, "USDC");
  });

  it("should allow configuring tokens on wallet clients", async () => {
    const provider = new MockEthereumProvider({
      eth_chainId: "0x1",
      eth_accounts: ["0x0123456789abcdef0123456789abcdef01234567"],
    });
    const clients = await getWalletClients(
      provider,
      "l1",
      new Map(),
      "mainnet",
      {
        tokens: [sampleToken],
      },
    );

    assert.equal(clients.length, 1);
    assert.equal(clients[0].tokens?.length, 1);
    assert.equal(clients[0].tokens?.[0]?.symbol, "USDC");
  });

  it("should allow configuring tokens on a single wallet client", async () => {
    const provider = new MockEthereumProvider({ eth_chainId: "0x1" });
    const client = await getWalletClient(
      provider,
      "l1",
      new Map(),
      "mainnet",
      "0x0123456789abcdef0123456789abcdef01234567",
      {
        tokens: [sampleToken],
      },
    );

    assert.equal(client.tokens?.length, 1);
    assert.equal(client.tokens?.[0]?.symbol, "USDC");
  });
});
