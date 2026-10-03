import type { HardhatUserConfig } from "../../../../../../../src/config.js";
import type { HttpNetworkAccountsUserConfig } from "../../../../../../../src/types/config.js";
import type { HookContext } from "../../../../../../../src/types/hooks.js";
import type {
  ChainType,
  NetworkConnection,
  TransactionSignature,
  TransactionSigner,
  UnsignedTransaction,
} from "../../../../../../../src/types/network.js";

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejects,
  assertRejectsWithHardhatError,
} from "@nomicfoundation/hardhat-test-utils";
import { keccak256 } from "@nomicfoundation/hardhat-utils/crypto";
import {
  hexStringToBigInt,
  hexStringToBytes,
  numberToHexString,
} from "@nomicfoundation/hardhat-utils/hex";
import { secp256k1 } from "ethereum-cryptography/secp256k1.js";
import { addr, authorization } from "micro-eth-signer";

import { createHardhatRuntimeEnvironment } from "../../../../../../../src/hre.js";

// A key that neither the node nor the local accounts know, standing in for a
// key in a KMS or a hardware wallet.
const REMOTE_PRIVATE_KEY = `0x${"22".repeat(32)}`;
const REMOTE_ADDRESS = addr.fromPrivateKey(REMOTE_PRIVATE_KEY).toLowerCase();

// Another key, used by a signer that signs for the wrong account.
const OTHER_PRIVATE_KEY = `0x${"33".repeat(32)}`;
const OTHER_ADDRESS = addr.fromPrivateKey(OTHER_PRIVATE_KEY).toLowerCase();

// The first account of the default mnemonic, which the simulated network
// manages and funds.
const NODE_ADDRESS = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
const NODE_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const DEFAULT_MNEMONIC =
  "test test test test test test test test test test test junk";

const RECIPIENT = "0x0000000000000000000000000000000000000012";

// Creation code of a contract that returns 42.
const INIT_CODE = "0x600a600c600039600a6000f3602a60005260206000f3";

const SECP256K1_N =
  0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

interface RecordingSigner extends TransactionSigner {
  readonly calls: UnsignedTransaction[];
  readonly signatures: TransactionSignature[];
}

/**
 * A signer that signs with a private key and records what it signs.
 * `tweak` changes the signature before it's returned.
 */
function createSigner(
  privateKey: string,
  tweak: (signature: TransactionSignature) => TransactionSignature = (
    signature,
  ) => signature,
): RecordingSigner {
  const calls: UnsignedTransaction[] = [];
  const signatures: TransactionSignature[] = [];

  return {
    calls,
    signatures,
    async signTransaction(transaction) {
      calls.push(transaction);

      const signature = secp256k1.sign(
        transaction.hash,
        hexStringToBytes(privateKey),
      );

      const result = {
        r: signature.r,
        s: signature.s,
        yParity: signature.recovery,
      };
      signatures.push(result);

      return tweak(result);
    },
  };
}

async function request(
  connection: NetworkConnection,
  method: string,
  params: unknown[] = [],
): Promise<unknown> {
  return await connection.provider.request({ method, params });
}

async function getPendingNonce(
  connection: NetworkConnection,
  address: string,
): Promise<bigint> {
  return hexStringToBigInt(
    String(
      await request(connection, "eth_getTransactionCount", [
        address,
        "pending",
      ]),
    ),
  );
}

async function getTransaction(
  connection: NetworkConnection,
  hash: unknown,
): Promise<Record<string, unknown>> {
  const transaction = await request(connection, "eth_getTransactionByHash", [
    hash,
  ]);

  assert.ok(
    typeof transaction === "object" && transaction !== null,
    "the transaction should be known to the node",
  );

  return { ...transaction };
}

/**
 * Sends a request and returns its result or its error message, to compare
 * the outcome of a request with and without a hook handler.
 */
async function settle(
  connection: NetworkConnection,
  method: string,
  params: unknown[],
): Promise<{ result: unknown } | { error: unknown }> {
  return await request(connection, method, params).then(
    (result: unknown) => ({ result }),
    (error: unknown) => ({
      // Parse errors quote a column that depends on the request id.
      error:
        error instanceof Error
          ? error.message.replace(/column \d+/, "column N")
          : error,
    }),
  );
}

function assertFilled(transaction: UnsignedTransaction | undefined): void {
  assert.ok(transaction !== undefined, "the signer should have been called");
  assert.equal(transaction.chainId, 31337n);
  assert.ok(transaction.gasLimit >= 21000n, "gasLimit should be filled");

  if (transaction.type === "legacy" || transaction.type === "eip2930") {
    assert.ok(transaction.gasPrice !== undefined, "gasPrice should be set");
    assert.equal(transaction.maxFeePerGas, undefined);
    assert.equal(transaction.maxPriorityFeePerGas, undefined);
  } else {
    assert.equal(transaction.gasPrice, undefined);
    assert.ok(
      transaction.maxFeePerGas !== undefined,
      "maxFeePerGas should be set",
    );
    assert.ok(
      transaction.maxPriorityFeePerGas !== undefined,
      "maxPriorityFeePerGas should be set",
    );
  }
}

const AUTHORIZATION = authorization.sign(
  { chainId: 31337n, address: RECIPIENT, nonce: 0n },
  OTHER_PRIVATE_KEY,
);

// Requests from REMOTE_ADDRESS, the transaction type Hardhat should build for
// each, and its JSON-RPC type.
const TRANSACTION_CASES: Array<{
  name: string;
  tx: Record<string, unknown>;
  type: UnsignedTransaction["type"];
  rpcType: string;
}> = [
  {
    name: "EIP-1559",
    tx: { to: RECIPIENT, value: "0x1" },
    type: "eip1559",
    rpcType: "0x2",
  },
  {
    name: "legacy",
    tx: { to: RECIPIENT, value: "0x1", gasPrice: "0x3b9aca00" },
    type: "legacy",
    rpcType: "0x0",
  },
  {
    name: "EIP-2930",
    tx: {
      to: RECIPIENT,
      value: "0x1",
      gasPrice: "0x3b9aca00",
      accessList: [
        { address: RECIPIENT, storageKeys: [`0x${"00".repeat(31)}01`] },
      ],
    },
    type: "eip2930",
    rpcType: "0x1",
  },
  {
    name: "EIP-7702",
    tx: {
      to: RECIPIENT,
      value: "0x1",
      authorizationList: [
        {
          chainId: "0x7a69",
          address: RECIPIENT,
          nonce: "0x0",
          yParity: numberToHexString(AUTHORIZATION.yParity),
          r: `0x${AUTHORIZATION.r.toString(16).padStart(64, "0")}`,
          s: `0x${AUTHORIZATION.s.toString(16).padStart(64, "0")}`,
        },
      ],
    },
    type: "eip7702",
    rpcType: "0x4",
  },
  {
    name: "contract creation",
    tx: { data: INIT_CODE },
    type: "eip1559",
    rpcType: "0x2",
  },
];

describe("TransactionSignerHandler", () => {
  for (const networkType of ["edr-simulated", "http"] as const) {
    describe(`on an ${networkType} network`, () => {
      // The http network connects to a simulated network served over HTTP.
      let server: { close(): Promise<void> } | undefined;
      let url = "";

      before(async () => {
        if (networkType === "http") {
          const serverHre = await createHardhatRuntimeEnvironment({});
          const jsonRpcServer = await serverHre.network.createServer(
            "default",
            "127.0.0.1",
          );
          const { address, port } = await jsonRpcServer.listen();
          server = jsonRpcServer;
          url = `http://${address}:${port}`;
        }
      });

      after(async () => {
        await server?.close();
      });

      /**
       * Connects to the network and funds the test accounts. If `signers` is
       * given, the `resolveTransactionSigner` hook returns `signers[from]`
       * and records every address it's asked about in `resolvedAddresses`.
       */
      async function connect({
        signers,
        resolvedAddresses = [],
        accounts,
      }: {
        signers?: Record<string, TransactionSigner>;
        resolvedAddresses?: string[];
        accounts?: HttpNetworkAccountsUserConfig;
      } = {}): Promise<NetworkConnection> {
        const config: HardhatUserConfig =
          networkType === "http"
            ? {
                networks: {
                  remote: {
                    type: "http",
                    url,
                    ...(accounts !== undefined ? { accounts } : {}),
                  },
                },
              }
            : {};

        const hre = await createHardhatRuntimeEnvironment(config);

        if (signers !== undefined) {
          hre.hooks.registerHandlers("network", {
            resolveTransactionSigner: async <
              ChainTypeT extends ChainType | string,
            >(
              context: HookContext,
              networkConnection: NetworkConnection<ChainTypeT>,
              from: string,
              next: (
                nextContext: HookContext,
                nextNetworkConnection: NetworkConnection<ChainTypeT>,
                nextFrom: string,
              ) => Promise<TransactionSigner | undefined>,
            ) => {
              resolvedAddresses.push(from);

              return (
                signers[from] ?? (await next(context, networkConnection, from))
              );
            },
          });
        }

        const connection = await hre.network.create(
          networkType === "http" ? "remote" : "default",
        );

        for (const address of [REMOTE_ADDRESS, OTHER_ADDRESS]) {
          await request(connection, "hardhat_setBalance", [
            address,
            "0x56bc75e2d63100000",
          ]);
        }

        return connection;
      }

      for (const { name, tx, type, rpcType } of TRANSACTION_CASES) {
        it(`should give the signer a filled ${name} transaction and send what it signed`, async () => {
          const signer = createSigner(REMOTE_PRIVATE_KEY);
          const connection = await connect({
            signers: { [REMOTE_ADDRESS]: signer },
          });
          const startNonce = await getPendingNonce(connection, REMOTE_ADDRESS);

          const hash = await request(connection, "eth_sendTransaction", [
            { from: REMOTE_ADDRESS, ...tx },
          ]);

          assert.equal(signer.calls.length, 1);
          const [signed] = signer.calls;
          assertFilled(signed);
          assert.equal(signed.type, type);
          assert.equal(signed.from, REMOTE_ADDRESS);
          assert.equal(signed.nonce, startNonce);
          assert.equal(signed.to, tx.to);
          assert.deepEqual(signed.hash, await keccak256(signed.serialized));

          const sent = await getTransaction(connection, hash);
          assert.equal(sent.from, REMOTE_ADDRESS);
          assert.equal(sent.type, rpcType);
          assert.equal(hexStringToBigInt(String(sent.nonce)), signed.nonce);
          assert.equal(hexStringToBigInt(String(sent.gas)), signed.gasLimit);
          assert.equal(
            hexStringToBigInt(String(sent.r)),
            signer.signatures[0].r,
          );
          assert.equal(
            hexStringToBigInt(String(sent.s)),
            signer.signatures[0].s,
          );

          if (tx.to === undefined) {
            const receipt = await request(
              connection,
              "eth_getTransactionReceipt",
              [hash],
            );
            assert.ok(
              typeof receipt === "object" &&
                receipt !== null &&
                "contractAddress" in receipt &&
                typeof receipt.contractAddress === "string",
              "the contract should be deployed",
            );
          }

          await connection.close();
        });
      }

      it("should keep an explicit nonce", async () => {
        const signer = createSigner(REMOTE_PRIVATE_KEY);
        const connection = await connect({
          signers: { [REMOTE_ADDRESS]: signer },
        });
        const startNonce = await getPendingNonce(connection, REMOTE_ADDRESS);

        // The node refuses a nonce ahead of the pending one, which shows that
        // Hardhat signed the explicit nonce instead of filling its own.
        await assertRejects(
          request(connection, "eth_sendTransaction", [
            {
              from: REMOTE_ADDRESS,
              to: RECIPIENT,
              nonce: numberToHexString(startNonce + 1n),
            },
          ]),
          (error) => error.message.includes("Nonce too high"),
        );
        assert.equal(signer.calls[0].nonce, startNonce + 1n);

        // The next send without a nonce gets the pending one.
        await request(connection, "eth_sendTransaction", [
          { from: REMOTE_ADDRESS, to: RECIPIENT },
        ]);
        assert.equal(signer.calls[1].nonce, startNonce);
        assert.equal(
          await getPendingNonce(connection, REMOTE_ADDRESS),
          startNonce + 1n,
        );

        await connection.close();
      });

      it("should lowercase a checksummed sender before calling the hook", async () => {
        const signer = createSigner(REMOTE_PRIVATE_KEY);
        const resolvedAddresses: string[] = [];
        const connection = await connect({
          signers: { [REMOTE_ADDRESS]: signer },
          resolvedAddresses,
        });

        await request(connection, "eth_sendTransaction", [
          { from: addr.addChecksum(REMOTE_ADDRESS), to: RECIPIENT },
        ]);

        assert.deepEqual(resolvedAddresses, [REMOTE_ADDRESS]);
        assert.equal(signer.calls.length, 1);

        await connection.close();
      });

      it("should accept a high-S signature and send its low-S equivalent", async () => {
        const signer = createSigner(
          REMOTE_PRIVATE_KEY,
          ({ r, s, yParity }) => ({
            r,
            s: SECP256K1_N - s,
            yParity: 1 - yParity,
          }),
        );
        const connection = await connect({
          signers: { [REMOTE_ADDRESS]: signer },
        });

        const hash = await request(connection, "eth_sendTransaction", [
          { from: REMOTE_ADDRESS, to: RECIPIENT },
        ]);

        const sent = await getTransaction(connection, hash);
        assert.equal(sent.from, REMOTE_ADDRESS);
        assert.equal(hexStringToBigInt(String(sent.s)), signer.signatures[0].s);
        // For typed transactions, `v` is the recovery id.
        assert.equal(
          hexStringToBigInt(String(sent.v)),
          BigInt(signer.signatures[0].yParity),
        );

        await connection.close();
      });

      it("should refuse a yParity other than 0 or 1, and send nothing", async () => {
        const signer = createSigner(
          REMOTE_PRIVATE_KEY,
          ({ r, s, yParity }) => ({ r, s, yParity: yParity + 27 }),
        );
        const connection = await connect({
          signers: { [REMOTE_ADDRESS]: signer },
        });
        const startNonce = await getPendingNonce(connection, REMOTE_ADDRESS);

        const outcome = await settle(connection, "eth_sendTransaction", [
          { from: REMOTE_ADDRESS, to: RECIPIENT },
        ]);

        const invalidYParity = signer.signatures[0].yParity + 27;
        assert.deepEqual(outcome, {
          error: new HardhatError(
            HardhatError.ERRORS.CORE.NETWORK
              .INVALID_TRANSACTION_SIGNER_SIGNATURE,
            {
              account: REMOTE_ADDRESS,
              reason: `yParity must be 0 or 1, but it is ${invalidYParity}`,
            },
          ).message,
        });

        assert.equal(
          await getPendingNonce(connection, REMOTE_ADDRESS),
          startNonce,
        );

        await connection.close();
      });

      it("should refuse a signature that doesn't recover to the sender, and send nothing", async () => {
        const signer = createSigner(OTHER_PRIVATE_KEY);
        const connection = await connect({
          signers: { [REMOTE_ADDRESS]: signer },
        });
        const startNonce = await getPendingNonce(connection, REMOTE_ADDRESS);

        await assertRejectsWithHardhatError(
          request(connection, "eth_sendTransaction", [
            { from: REMOTE_ADDRESS, to: RECIPIENT, value: "0x1" },
          ]),
          HardhatError.ERRORS.CORE.NETWORK.INVALID_TRANSACTION_SIGNER_SIGNATURE,
          {
            account: REMOTE_ADDRESS,
            reason: `it recovers to ${OTHER_ADDRESS}`,
          },
        );

        assert.equal(signer.calls.length, 1);
        assert.equal(
          await getPendingNonce(connection, REMOTE_ADDRESS),
          startNonce,
        );

        await connection.close();
      });

      it("should propagate an error thrown by the signer, and send nothing", async () => {
        const failure = new Error("the KMS is unreachable");
        const connection = await connect({
          signers: {
            [REMOTE_ADDRESS]: {
              async signTransaction() {
                throw failure;
              },
            },
          },
        });
        const startNonce = await getPendingNonce(connection, REMOTE_ADDRESS);

        await assertRejects(
          request(connection, "eth_sendTransaction", [
            { from: REMOTE_ADDRESS, to: RECIPIENT },
          ]),
          (error) => error === failure,
        );

        assert.equal(
          await getPendingNonce(connection, REMOTE_ADDRESS),
          startNonce,
        );

        await connection.close();
      });

      it("should leave node-managed accounts unchanged when no signer is returned", async () => {
        const signer = createSigner(REMOTE_PRIVATE_KEY);
        const resolvedAddresses: string[] = [];
        const connection = await connect({
          signers: { [REMOTE_ADDRESS]: signer },
          resolvedAddresses,
        });

        // Without `from`, the sender handler picks the node's first account.
        const hash = await request(connection, "eth_sendTransaction", [
          { to: RECIPIENT, value: "0x1" },
        ]);

        assert.deepEqual(resolvedAddresses, [NODE_ADDRESS]);
        assert.equal(signer.calls.length, 0);
        assert.equal(
          (await getTransaction(connection, hash)).from,
          NODE_ADDRESS,
        );

        await connection.close();
      });

      it("should fail the same way as without the hook for accounts it doesn't sign for", async () => {
        const resolvedAddresses: string[] = [];
        const withHook = await connect({ signers: {}, resolvedAddresses });
        const withoutHook = await connect();

        for (const tx of [
          // Unknown to the node.
          { from: REMOTE_ADDRESS, to: RECIPIENT },
          // Not an address: the hook isn't called. Gas and gas price are
          // set, so the request reaches the signer handler.
          {
            from: "0x1234",
            to: RECIPIENT,
            gas: "0x5208",
            gasPrice: "0x3b9aca00",
          },
        ]) {
          assert.deepEqual(
            await settle(withHook, "eth_sendTransaction", [tx]),
            await settle(withoutHook, "eth_sendTransaction", [tx]),
          );
        }

        assert.deepEqual(resolvedAddresses, [REMOTE_ADDRESS]);

        await withHook.close();
        await withoutHook.close();
      });

      it("should leave eth_signTransaction unchanged", async () => {
        const signer = createSigner(REMOTE_PRIVATE_KEY);
        const withHook = await connect({
          signers: { [REMOTE_ADDRESS]: signer },
        });
        const withoutHook = await connect();

        const params = [{ from: REMOTE_ADDRESS, to: RECIPIENT }];
        assert.deepEqual(
          await settle(withHook, "eth_signTransaction", params),
          await settle(withoutHook, "eth_signTransaction", params),
        );
        assert.equal(signer.calls.length, 0);

        await withHook.close();
        await withoutHook.close();
      });

      if (networkType === "http") {
        const LOCAL_ACCOUNTS: Array<[string, HttpNetworkAccountsUserConfig]> = [
          ["private keys", [NODE_PRIVATE_KEY]],
          ["an HD wallet", { mnemonic: DEFAULT_MNEMONIC, count: 1 }],
        ];

        for (const [name, accounts] of LOCAL_ACCOUNTS) {
          it(`should sign with a plugin signer and with local accounts from ${name} on the same connection`, async () => {
            const signer = createSigner(REMOTE_PRIVATE_KEY);
            const resolvedAddresses: string[] = [];
            const connection = await connect({
              signers: { [REMOTE_ADDRESS]: signer },
              resolvedAddresses,
              accounts,
            });

            assert.deepEqual(await request(connection, "eth_accounts"), [
              NODE_ADDRESS,
            ]);

            // Before this hook, the local accounts handler refused any sender
            // it held no key for.
            const remoteHash = await request(
              connection,
              "eth_sendTransaction",
              [{ from: REMOTE_ADDRESS, to: RECIPIENT }],
            );
            assert.equal(signer.calls.length, 1);
            assert.equal(
              (await getTransaction(connection, remoteHash)).from,
              REMOTE_ADDRESS,
            );

            const localHash = await request(connection, "eth_sendTransaction", [
              { from: NODE_ADDRESS, to: RECIPIENT },
            ]);
            assert.equal(signer.calls.length, 1);
            assert.equal(
              (await getTransaction(connection, localHash)).from,
              NODE_ADDRESS,
            );

            assert.deepEqual(resolvedAddresses, [REMOTE_ADDRESS, NODE_ADDRESS]);

            await connection.close();
          });

          it(`should prefer a plugin signer over a local account from ${name} for the same address`, async () => {
            const signer = createSigner(NODE_PRIVATE_KEY);
            const connection = await connect({
              signers: { [NODE_ADDRESS]: signer },
              accounts,
            });

            const hash = await request(connection, "eth_sendTransaction", [
              { from: NODE_ADDRESS, to: RECIPIENT },
            ]);

            assert.equal(signer.calls.length, 1);
            assert.equal(
              (await getTransaction(connection, hash)).from,
              NODE_ADDRESS,
            );

            await connection.close();
          });
        }
      }
    });
  }
});
