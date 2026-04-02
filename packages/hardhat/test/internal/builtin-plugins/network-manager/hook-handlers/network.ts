import type { HttpNetworkConfig } from "../../../../../src/types/config.js";
import type {
  HookContext,
  NetworkHooks,
} from "../../../../../src/types/hooks.js";
import type {
  ChainType,
  NetworkConnection,
} from "../../../../../src/types/network.js";
import type {
  JsonRpcRequest,
  JsonRpcResponse,
  SuccessfulJsonRpcResponse,
} from "../../../../../src/types/providers.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { numberToHexString } from "@nomicfoundation/hardhat-utils/hex";

import factory from "../../../../../src/internal/builtin-plugins/network-manager/hook-handlers/network.js";
import { EthereumMockedProvider } from "../request-handlers/ethereum-mocked-provider.js";

describe("network hook handler", () => {
  it("should initialize request handlers on first onRequest call", async () => {
    const handlers = await createHandlersFromFactory();
    const { connection, context, next } = setupRequestMocks();

    const request = createRequestWithId(99);

    const response = await handlers.onRequest(
      context,
      connection,
      request,
      next,
    );

    assert.deepEqual(response.id, 99);
  });

  it("should reuse cached handlers on subsequent calls with the same connection", async () => {
    const handlers = await createHandlersFromFactory();
    const { connection, provider, context, next } = setupRequestMocks();

    await handlers.onRequest(context, connection, createRequestWithId(1), next);
    await handlers.onRequest(context, connection, createRequestWithId(2), next);

    // ChainIdValidatorHandler validates once then caches via #alreadyValidated.
    // If handlers were recreated on the second call, a fresh validator would
    // call eth_chainId again. Only 1 call proves the same handler instances
    // were reused from the cache.
    assert.equal(provider.getNumberOfCalls("eth_chainId"), 1);
  });

  it("should only create handlers once when multiple concurrent onRequest calls race", async () => {
    const handlers = await createHandlersFromFactory();
    const { connection, provider, context, next } = setupRequestMocks();

    const concurrentCalls = 10;

    const results = await Promise.all(
      Array.from({ length: concurrentCalls }, (_, i) =>
        handlers.onRequest(context, connection, createRequestWithId(i), next),
      ),
    );

    // All concurrent calls should succeed without errors
    assert.equal(results.length, concurrentCalls);
    for (const result of results) {
      assert.equal(result.jsonrpc, "2.0");
    }

    // ChainIdValidatorHandler validates once then caches. If the mutex allowed
    // duplicate handler creation, each fresh validator would call eth_chainId.
    // Only 1 call proves handlers were created exactly once.
    assert.equal(provider.getNumberOfCalls("eth_chainId"), 1);
  });

  it("should create separate handlers for different connections", async () => {
    const handlers = await createHandlersFromFactory();
    const { context, next } = setupRequestMocks();

    const { connection: conn1 } = createMockNetworkConnection(
      {
        gas: 100n,
        gasPrice: 200n,
      },
      1,
    );
    const res1 = await handlers.onRequest(
      context,
      conn1,
      createRequestWithId(1),
      next,
    );

    const { connection: conn2 } = createMockNetworkConnection(
      {
        gas: 999n,
        gasPrice: 888n,
      },
      2,
    );
    const res2 = await handlers.onRequest(
      context,
      conn2,
      createRequestWithId(2),
      next,
    );

    // Assert the fixed gas/gasPrice handlers should produce different values
    assert(
      isSuccessfulResponse(res1),
      "expected res1 to be a successful response",
    );
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- result is typed as unknown, narrowing to the expected shape */
    const params1 = res1.result as Array<Record<string, string>>;
    assert.equal(params1[0].gas, numberToHexString(100n));
    assert.equal(params1[0].gasPrice, numberToHexString(200n));

    assert(
      isSuccessfulResponse(res2),
      "expected res2 to be a successful response",
    );
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- result is typed as unknown, narrowing to the expected shape */
    const params2 = res2.result as Array<Record<string, string>>;
    assert.equal(params2[0].gas, numberToHexString(999n));
    assert.equal(params2[0].gasPrice, numberToHexString(888n));
  });
});

async function createHandlersFromFactory(): Promise<
  Required<Pick<NetworkHooks, "onRequest" | "closeConnection">>
> {
  const { onRequest, closeConnection } = await factory();

  if (onRequest === undefined || closeConnection === undefined) {
    throw new Error(
      "Factory did not return the expected handlers. Check the factory implementation.",
    );
  }

  return { onRequest, closeConnection };
}

function setupRequestMocks(overrides: Partial<HttpNetworkConfig> = {}) {
  const { connection, provider } = createMockNetworkConnection(overrides);
  /* eslint-disable @typescript-eslint/consistent-type-assertions -- the context is only needed for type compatibility in the tests */
  const context = {} as HookContext;
  const next = createMockNext();

  return {
    connection,
    provider,
    context,
    next,
  };
}

function createMockNetworkConnection(
  overrides: Partial<HttpNetworkConfig> = {},
  connectionId: number = 0,
): {
  connection: NetworkConnection<ChainType>;
  provider: EthereumMockedProvider;
} {
  const provider = new EthereumMockedProvider();

  // Set return values needed by ChainIdValidatorHandler
  provider.setReturnValue("eth_chainId", "0x1");

  const networkConfig: HttpNetworkConfig = {
    type: "http",
    chainId: 1,
    gas: 21000n,
    gasPrice: 1000n,
    gasMultiplier: 1,
    from: "0x2a97a65d5673a2c61e95ce33cecadf24f654f96d",
    accounts: "remote",
    url: {
      _type: "ResolvedConfigurationVariable",
      format: "string",
      get: async () => "http://localhost:8545",
      getUrl: async () => "http://localhost:8545",
      getBigInt: async () => 0n,
      getHexString: async () => "0x",
    },
    httpHeaders: {},
    timeout: 20_000,
    ...overrides,
  };

  const connection: NetworkConnection<ChainType> = {
    id: connectionId,
    networkName: "localhost",
    networkConfig,
    chainType: "generic",
    provider,
    close: async () => {},
  };

  return { connection, provider };
}

function createMockNext() {
  return async <ChainTypeT extends ChainType | string>(
    _context: HookContext,
    _networkConnection: NetworkConnection<ChainTypeT>,
    jsonRpcRequest: JsonRpcRequest,
  ): Promise<JsonRpcResponse> => ({
    jsonrpc: "2.0",
    id: jsonRpcRequest.id,
    result: jsonRpcRequest.params,
  });
}

function createRequestWithId(id: number): JsonRpcRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: "eth_sendTransaction",
    params: [{ to: "0x0000000000000000000000000000000000000012" }],
  };
}

function isSuccessfulResponse(
  response: JsonRpcResponse,
): response is SuccessfulJsonRpcResponse {
  return "result" in response;
}
