import type Eth from "@ledgerhq/hw-app-eth";
import type { LedgerEthTransactionResolution } from "@ledgerhq/hw-app-eth/lib/services/types.js";
import type { EIP712Message } from "@ledgerhq/types-live";

import assert from "node:assert/strict";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";

/**
 * Mock implementation of the `Eth` class from `@ledgerhq/hw-app-eth`.
 * This mock allows overriding specific methods of the `Eth` class to return controlled test values.
 */

export interface Rsv {
  v: number;
  r: string;
  s: string;
}

export interface MethodsConfig {
  getAddress?: {
    result: (
      searchedPath: string,
    ) => { address: string; publicKey: string } | string;
    /** If set, throws errorToThrow when call count equals this value */
    throwOnCall?: number;
    errorToThrow?: Error;
  };
  signPersonalMessage?: {
    result: Rsv;
    expectedParams?: {
      path: string;
      data: string;
    };
    /** If set, throws errorToThrow when call count equals this value */
    throwOnCall?: number;
    /** If set, throws errorToThrow on every call */
    alwaysThrow?: boolean;
    errorToThrow?: Error;
  };
  signEIP712Message?:
    | {
        shouldThrow: true;
        result?: never;
        expectedParams?: never;
      }
    | {
        shouldThrow: false;
        result: Rsv;
        expectedParams: {
          path: string;
          jsonMessage: EIP712Message;
        };
      };
  signEIP712HashedMessage?: {
    result: Rsv;
    expectedParams: {
      path: string;
      domainSeparatorHex: string;
      hashStructMessageHex: string;
    };
  };
  signTransaction?: {
    result: { v: string; r: string; s: string };
    expectedParams?: {
      path: string;
      rawTxHex: string;
      resolution?: LedgerEthTransactionResolution | null;
    };
    /** If set, throws errorToThrow when call count equals this value */
    throwOnCall?: number;
    errorToThrow?: Error;
  };
}

export interface MockCallState {
  totalCalls: number;
  args: unknown[];
}

export function getEthMocked(
  methodsConfig: MethodsConfig,
): [typeof Eth.default, Map<string, MockCallState>] {
  const calls = new Map<string, MockCallState>();

  for (const method of [
    "getAddress",
    "signPersonalMessage",
    "signTransaction",
  ]) {
    calls.set(method, { totalCalls: 0, args: [] });
  }

  return [
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- this is a mock for testing purpose
    class EthConstructorMocked {
      readonly #methodsConfig: MethodsConfig = methodsConfig;

      constructor() {}

      public async getAddress(
        searchedPath: string,
      ): Promise<{ address: string; publicKey: string } | string> {
        assertHardhatInvariant(
          this.#methodsConfig.getAddress !== undefined,
          "getAddress should be defined",
        );

        const c = calls.get("getAddress");
        assert.ok(c !== undefined, "c should be defined");
        c.totalCalls++;
        c.args.push(searchedPath);

        // Check if we should throw on this call
        const config = this.#methodsConfig.getAddress;
        if (
          config.throwOnCall !== undefined &&
          c.totalCalls === config.throwOnCall &&
          config.errorToThrow !== undefined
        ) {
          throw config.errorToThrow;
        }

        return this.#methodsConfig.getAddress.result(searchedPath);
      }

      public async signPersonalMessage(
        path: string,
        messageHex: string,
      ): Promise<Rsv> {
        assertHardhatInvariant(
          this.#methodsConfig.signPersonalMessage !== undefined,
          "signPersonalMessage should be defined",
        );

        const c = calls.get("signPersonalMessage");
        assert.ok(c !== undefined, "c should be defined");
        c.totalCalls++;
        c.args.push({ path, messageHex });

        // Check if we should throw on this call
        const config = this.#methodsConfig.signPersonalMessage;
        if (config.errorToThrow !== undefined) {
          if (config.alwaysThrow === true) {
            throw config.errorToThrow;
          }
          if (
            config.throwOnCall !== undefined &&
            c.totalCalls === config.throwOnCall
          ) {
            throw config.errorToThrow;
          }
        }

        // Only validate params if expectedParams is provided
        if (config.expectedParams !== undefined) {
          assert.equal(path, config.expectedParams.path);
          assert.equal(messageHex, config.expectedParams.data);
        }

        return this.#methodsConfig.signPersonalMessage.result;
      }

      public async signEIP712Message(
        path: string,
        jsonMessage: EIP712Message,
      ): Promise<Rsv> {
        assertHardhatInvariant(
          this.#methodsConfig.signEIP712Message !== undefined,
          "signEIP712Message should be defined",
        );

        if (this.#methodsConfig.signEIP712Message.shouldThrow) {
          throw new Error("Unsupported Ledger");
        }

        assert.equal(
          path,
          this.#methodsConfig.signEIP712Message.expectedParams.path,
        );
        assert.deepEqual(
          jsonMessage,
          this.#methodsConfig.signEIP712Message.expectedParams.jsonMessage,
        );

        return this.#methodsConfig.signEIP712Message.result;
      }

      public async signEIP712HashedMessage(
        path: string,
        domainSeparatorHex: string,
        hashStructMessageHex: string,
      ) {
        assertHardhatInvariant(
          this.#methodsConfig.signEIP712HashedMessage !== undefined,
          "signEIP712HashedMessage should be defined",
        );

        assert.equal(
          path,
          this.#methodsConfig.signEIP712HashedMessage.expectedParams.path,
        );
        assert.equal(
          domainSeparatorHex,
          this.#methodsConfig.signEIP712HashedMessage.expectedParams
            .domainSeparatorHex,
        );
        assert.equal(
          hashStructMessageHex,
          this.#methodsConfig.signEIP712HashedMessage.expectedParams
            .hashStructMessageHex,
        );

        return this.#methodsConfig.signEIP712HashedMessage.result;
      }

      public async signTransaction(
        path: string,
        rawTxHex: string,
        resolution: LedgerEthTransactionResolution | null,
      ) {
        assertHardhatInvariant(
          this.#methodsConfig.signTransaction !== undefined,
          "signTransaction should be defined",
        );

        const c = calls.get("signTransaction");
        assert.ok(c !== undefined, "c should be defined");
        c.totalCalls++;
        c.args.push({ path, rawTxHex, resolution });

        // Check if we should throw on this call
        const config = this.#methodsConfig.signTransaction;
        if (
          config.throwOnCall !== undefined &&
          c.totalCalls === config.throwOnCall &&
          config.errorToThrow !== undefined
        ) {
          throw config.errorToThrow;
        }

        // Only validate params if expectedParams is provided
        if (config.expectedParams !== undefined) {
          assert.equal(path, config.expectedParams.path);
          assert.equal(rawTxHex, config.expectedParams.rawTxHex);
          assert.deepEqual(resolution, config.expectedParams.resolution);
        }

        return this.#methodsConfig.signTransaction.result;
      }
    } as unknown as typeof Eth.default,
    calls,
  ];
}
