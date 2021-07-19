import Common from "@ethereumjs/common";
import { AccessListEIP2930Transaction, Transaction } from "@ethereumjs/tx";
import { assert } from "chai";
import { BN, toBuffer } from "ethereumjs-util";

import {
  bufferToRpcData,
  numberToRpcQuantity,
} from "../../../../../../src/internal/core/jsonrpc/types/base-types";
import { assertInvalidArgumentsError } from "../../../helpers/assertions";
import { DEFAULT_ACCOUNTS_ADDRESSES } from "../../../helpers/providers";
import { deployContract } from "../../../helpers/transactions";
import { useProvider as importedUseProvider } from "../../../helpers/useProvider";

describe("Eth module - hardfork dependant tests", function () {
  function useProviderAndCommon(hardfork: string) {
    importedUseProvider({ hardfork });
    beforeEach(async function () {
      // TODO: Find out a better way to obtain the common here

      // eslint-disable-next-line dot-notation,@typescript-eslint/dot-notation
      await this.hardhatNetworkProvider["_init"]();
      // eslint-disable-next-line dot-notation,@typescript-eslint/dot-notation
      this.common = this.hardhatNetworkProvider["_common"];
    });
  }

  const privateKey = Buffer.from(
    "17ade313db5de97d19b4cfbc820d15e18a6c710c1afbf01c1f31249970d3ae46",
    "hex"
  );

  function getSampleSignedTx(common?: Common) {
    if (common === undefined) {
      common = new Common({
        chain: "mainnet",
        hardfork: "spuriousDragon",
      });
    }

    const tx = Transaction.fromTxData(
      {
        to: "0x1111111111111111111111111111111111111111",
        gasLimit: 21000,
        gasPrice: 0,
      },
      {
        common,
      }
    );

    return tx.sign(privateKey);
  }

  function getSampleSignedAccessListTx(common?: Common) {
    if (common === undefined) {
      common = new Common({
        chain: "mainnet",
        hardfork: "berlin",
      });
    }

    const tx = AccessListEIP2930Transaction.fromTxData(
      {
        to: "0x1111111111111111111111111111111111111111",
        gasLimit: 21000,
        gasPrice: 0,
      },
      {
        common,
      }
    );

    return tx.sign(privateKey);
  }

  describe("Transaction, call and estimate gas validations", function () {
    describe("chain id validation", function () {
      describe("In a hardfork without access list but with EIP-155", function () {
        useProviderAndCommon("spuriousDragon");

        it("Should validate the chain id if sent to eth_sendTransaction", async function () {
          const [sender] = await this.provider.send("eth_accounts");
          await assertInvalidArgumentsError(
            this.provider,
            "eth_sendTransaction",
            [{ from: sender, to: sender, chainId: numberToRpcQuantity(1) }],
            "Invalid chainId"
          );
        });

        it("Should validate the chain id if an EIP-155 tx is sent with eth_sendRawTransaction", async function () {
          const signedTx = getSampleSignedTx();
          const serialized = bufferToRpcData(signedTx.serialize());

          await assertInvalidArgumentsError(
            this.provider,
            "eth_sendRawTransaction",
            [serialized],
            "signed for another chain"
          );
        });
      });

      describe("In a hardfork with access list", function () {
        useProviderAndCommon("berlin");

        it("Should validate the chain id if sent to eth_sendTransaction using access list", async function () {
          const [sender] = await this.provider.send("eth_accounts");
          await assertInvalidArgumentsError(
            this.provider,
            "eth_sendTransaction",
            [
              {
                from: sender,
                to: sender,
                chainId: numberToRpcQuantity(1),
                accessList: [],
              },
            ],
            "Invalid chainId"
          );
        });

        it("Should validate the chain id in eth_sendRawTransaction using an access list tx", async function () {
          const signedTx = getSampleSignedAccessListTx();
          const serialized = bufferToRpcData(signedTx.serialize());

          await assertInvalidArgumentsError(
            this.provider,
            "eth_sendRawTransaction",
            [serialized],
            "Trying to send a raw transaction with an invalid chainId"
          );
        });
      });
    });

    describe("Transaction type validation by hardfork", function () {
      describe("Without EIP155 nor access list", function () {
        useProviderAndCommon("tangerineWhistle");

        it("Should reject an eth_sendRawTransaction if signed with EIP-155", async function () {
          const spuriousDragonCommon = this.common.copy();
          spuriousDragonCommon.setHardfork("spuriousDragon");

          const signedTx = getSampleSignedTx(spuriousDragonCommon);
          const serialized = bufferToRpcData(signedTx.serialize());

          await assertInvalidArgumentsError(
            this.provider,
            "eth_sendRawTransaction",
            [serialized],
            "Trying to send an EIP-155 transaction"
          );
        });

        it("Should reject an eth_sendRawTransaction if the tx uses an access list", async function () {
          const berlinCommon = this.common.copy();
          berlinCommon.setHardfork("berlin");

          const signedTx = getSampleSignedAccessListTx(berlinCommon);
          const serialized = bufferToRpcData(signedTx.serialize());

          await assertInvalidArgumentsError(
            this.provider,
            "eth_sendRawTransaction",
            [serialized],
            "Trying to send an EIP-2930 transaction"
          );
        });

        it("Should reject an eth_sendTransaction if an access list was provided", async function () {
          const [sender] = await this.provider.send("eth_accounts");

          await assertInvalidArgumentsError(
            this.provider,
            "eth_sendTransaction",
            [{ from: sender, to: sender, accessList: [] }],
            "Access list received but is not supported by the current hardfork"
          );
        });
      });

      describe("With EIP155 and not access list", function () {
        useProviderAndCommon("spuriousDragon");

        it("Should accept an eth_sendRawTransaction if signed with EIP-155", async function () {
          const signedTx = getSampleSignedTx(this.common);
          const serialized = bufferToRpcData(signedTx.serialize());

          await this.provider.send("eth_sendRawTransaction", [serialized]);
        });

        it("Should reject an eth_sendRawTransaction if the tx uses an access list", async function () {
          const berlinCommon = this.common.copy();
          berlinCommon.setHardfork("berlin");

          const signedTx = getSampleSignedAccessListTx(berlinCommon);
          const serialized = bufferToRpcData(signedTx.serialize());

          await assertInvalidArgumentsError(
            this.provider,
            "eth_sendRawTransaction",
            [serialized],
            "Trying to send an EIP-2930 transaction"
          );
        });

        it("Should reject an eth_sendTransaction if an access list was provided", async function () {
          const [sender] = await this.provider.send("eth_accounts");

          await assertInvalidArgumentsError(
            this.provider,
            "eth_sendTransaction",
            [{ from: sender, to: sender, accessList: [] }],
            "Access list received but is not supported by the current hardfork"
          );
        });
      });

      describe("With access list", function () {
        useProviderAndCommon("berlin");

        it("Should accept an eth_sendRawTransaction if the tx uses an access list", async function () {
          const signedTx = getSampleSignedAccessListTx(this.common);
          const serialized = bufferToRpcData(signedTx.serialize());

          await this.provider.send("eth_sendRawTransaction", [serialized]);
        });

        it("Should accept an eth_sendTransaction if an access list was provided", async function () {
          const [sender] = await this.provider.send("eth_accounts");
          await this.provider.send("eth_sendTransaction", [
            {
              from: sender,
              to: sender,
              accessList: [],
            },
          ]);
        });
      });
    });

    describe("Call and estimate gas types validation by hardfork", function () {
      describe("Without access list", function () {
        useProviderAndCommon("petersburg");

        it("Should reject an eth_call if an access list was provided", async function () {
          const [sender] = await this.provider.send("eth_accounts");

          await assertInvalidArgumentsError(
            this.provider,
            "eth_call",
            [{ from: sender, to: sender, accessList: [] }],
            "Access list received but is not supported by the current hardfork"
          );
        });

        it("Should reject an eth_estimateGas if an access list was provided", async function () {
          const [sender] = await this.provider.send("eth_accounts");

          await assertInvalidArgumentsError(this.provider, "eth_estimateGas", [
            { from: sender, to: sender, accessList: [] },
          ]);
        });
      });

      describe("With access list", function () {
        useProviderAndCommon("berlin");

        it("Should accept an eth_call if an access list was provided", async function () {
          const [sender] = await this.provider.send("eth_accounts");

          await this.provider.send("eth_call", [
            { from: sender, to: sender, accessList: [] },
          ]);
        });

        it("Should accept an eth_estimateGas if an access list was provided", async function () {
          const [sender] = await this.provider.send("eth_accounts");

          await this.provider.send("eth_estimateGas", [
            { from: sender, to: sender, accessList: [] },
          ]);
        });
      });
    });
  });

  describe("Transaction and receipt output formatting", function () {
    describe("Transactions formatting", function () {
      describe("Before berlin", function () {
        useProviderAndCommon("petersburg");
        it("Should not include the fields type, chainId and accessList", async function () {
          const [sender] = await this.provider.send("eth_accounts");
          const txHash = await this.provider.send("eth_sendTransaction", [
            { from: sender, to: sender },
          ]);

          const tx = await this.provider.send("eth_getTransactionByHash", [
            txHash,
          ]);

          assert.isUndefined(tx.type);
          assert.isUndefined(tx.chainId);
          assert.isUndefined(tx.accessList);
        });
      });

      describe("After berlin", function () {
        useProviderAndCommon("berlin");
        describe("legacy tx", function () {
          it("Should include the field type, but not chainId and accessList", async function () {
            const [sender] = await this.provider.send("eth_accounts");
            const txHash = await this.provider.send("eth_sendTransaction", [
              { from: sender, to: sender },
            ]);

            const tx = await this.provider.send("eth_getTransactionByHash", [
              txHash,
            ]);

            assert.equal(tx.type, numberToRpcQuantity(0));
            assert.isUndefined(tx.chainId);
            assert.isUndefined(tx.accessList);
          });
        });

        describe("access list tx", function () {
          it("Should include the fields type,chainId and accessList", async function () {
            const accessList = [
              {
                address: "0x1234567890123456789012345678901234567890",
                storageKeys: [
                  "0x1111111111111111111111111111111111111111111111111111111111111111",
                ],
              },
            ];
            const [sender] = await this.provider.send("eth_accounts");
            const txHash = await this.provider.send("eth_sendTransaction", [
              {
                from: sender,
                to: sender,
                accessList,
              },
            ]);

            const tx = await this.provider.send("eth_getTransactionByHash", [
              txHash,
            ]);

            assert.equal(tx.type, numberToRpcQuantity(1));
            assert.equal(
              tx.chainId,
              numberToRpcQuantity(this.common.chainId())
            );
            assert.deepEqual(tx.accessList, accessList);
          });

          it("Should accept access lists with null storageKeys", async function () {
            const accessList = [
              {
                address: "0x1234567890123456789012345678901234567890",
                storageKeys: null,
              },
            ];
            const [sender] = await this.provider.send("eth_accounts");
            const txHash = await this.provider.send("eth_sendTransaction", [
              {
                from: sender,
                to: sender,
                accessList,
              },
            ]);

            const tx = await this.provider.send("eth_getTransactionByHash", [
              txHash,
            ]);

            assert.equal(tx.type, numberToRpcQuantity(1));
            assert.equal(
              tx.chainId,
              numberToRpcQuantity(this.common.chainId())
            );
            assert.deepEqual(tx.accessList, [
              {
                address: "0x1234567890123456789012345678901234567890",
                storageKeys: [],
              },
            ]);
          });
        });
      });

      // TODO: There's a case missing here, which is forking from Berlin but choosing the local hardfork to be < Berlin.
      //  In that case only remote EIP-2930 txs should have a type.
    });

    describe("Receipts formatting", function () {
      describe("Before byzantium", function () {
        useProviderAndCommon("spuriousDragon");

        it("Should have a root field, and shouldn't have a status one nor type", async function () {
          const [sender] = await this.provider.send("eth_accounts");
          const tx = await this.provider.send("eth_sendTransaction", [
            { from: sender, to: sender },
          ]);

          const receipt = await this.provider.send(
            "eth_getTransactionReceipt",
            [tx]
          );

          assert.isDefined(receipt.root);
          assert.isUndefined(receipt.status);
          assert.isUndefined(receipt.type);
        });
      });

      describe("After byzantium, before berlin", function () {
        useProviderAndCommon("byzantium");

        it("Should have a status field and not a root one nor type", async function () {
          const [sender] = await this.provider.send("eth_accounts");
          const tx = await this.provider.send("eth_sendTransaction", [
            { from: sender, to: sender },
          ]);

          const receipt = await this.provider.send(
            "eth_getTransactionReceipt",
            [tx]
          );

          assert.isDefined(receipt.status);
          assert.isUndefined(receipt.root);
          assert.isUndefined(receipt.type);
        });
      });

      describe("After berlin", function () {
        useProviderAndCommon("berlin");

        it("Should have status and type fields and not a root one", async function () {
          const [sender] = await this.provider.send("eth_accounts");
          const tx = await this.provider.send("eth_sendTransaction", [
            { from: sender, to: sender },
          ]);

          const receipt = await this.provider.send(
            "eth_getTransactionReceipt",
            [tx]
          );

          assert.isDefined(receipt.status);
          assert.isUndefined(receipt.root);
          assert.equal(receipt.type, "0x0");
        });
      });
    });
  });

  describe("Impersonated accounts", function () {
    useProviderAndCommon("berlin");

    it("should allow sending access list txs from impersonated accounts", async function () {
      // impersonate and add funds to some account
      const impersonated = "0x462B1B252FC8e9A447807e4494b271844fBCDa10";
      await this.provider.send("eth_sendTransaction", [
        {
          from: DEFAULT_ACCOUNTS_ADDRESSES[0],
          to: impersonated,
          value: numberToRpcQuantity(new BN("100000000000000000")),
        },
      ]);
      await this.provider.send("hardhat_impersonateAccount", [impersonated]);

      // send tx from impersonated account
      const txHash = await this.provider.send("eth_sendTransaction", [
        {
          from: impersonated,
          to: impersonated,
          accessList: [],
        },
      ]);

      const tx = await this.provider.send("eth_getTransactionByHash", [txHash]);

      assert.isDefined(tx.accessList);
      assert.isArray(tx.accessList);
    });
  });

  describe("Access list transactions", function () {
    useProviderAndCommon("berlin");

    // This contract is useful to test that an access list is being used.
    //
    // The way it works is by letting you control how much gas "test"
    // forwards to "write".
    //
    // If you don't provide the right access list, all the storage accesses that
    // "write" makes are cold, and hence more expensive. You can find the max
    // amount of gas that you can forward to "write" that makes it OOG in this case.
    // That OOG makes "test" revert.
    //
    // Now, if you do provide an access list, all the storage accesses are warm,
    // so cheaper. If you forward the same amount of gas to "write" than before,
    // but provide an access list, it won't OOG and "test" won't revert.
    //
    // pragma solidity 0.7.0;
    //
    // contract C {
    //     uint a = 1; uint b = 1; uint c = 1; uint d = 1; uint e = 1; uint f = 1; uint g = 1;
    //     uint h = 1; uint i = 1; uint j = 1; uint k = 1; uint l = 1; uint m = 1; uint n = 1;
    //
    //     function test(uint gasToForward) public {
    //         this.write{gas: gasToForward}();
    //     }
    //
    //     function write() public {
    //         a += 1; b += 1; c += 1; d += 1; e += 1; f += 1; g += 1;
    //         h += 1; i += 1; j += 1; k += 1; l += 1; m += 1; n += 1;
    //     }
    // }
    const TEST_CONTRACT_DEPLOYMENT_BYTECODE =
      "0x6080604052600160005560018055600160025560016003556001600455600160055560016006556001600755600160085560016009556001600a556001600b556001600c556001600d5534801561005557600080fd5b506101fc806100656000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c806329e99f071461003b578063bcb4ab0e14610069575b600080fd5b6100676004803603602081101561005157600080fd5b8101908080359060200190929190505050610073565b005b6100716100d8565b005b3073ffffffffffffffffffffffffffffffffffffffff1663bcb4ab0e826040518263ffffffff1660e01b8152600401600060405180830381600088803b1580156100bc57600080fd5b5087f11580156100d0573d6000803e3d6000fd5b505050505050565b6001600080828254019250508190555060018060008282540192505081905550600160026000828254019250508190555060016003600082825401925050819055506001600460008282540192505081905550600160056000828254019250508190555060016006600082825401925050819055506001600760008282540192505081905550600160086000828254019250508190555060016009600082825401925050819055506001600a600082825401925050819055506001600b600082825401925050819055506001600c600082825401925050819055506001600d6000828254019250508190555056fea2646970667358221220f49d12643dee70a8cfde7a6346c0ca133768619dd2fb07c942e69d5c0433fe3b64736f6c63430007000033";
    const TEST_FUNCTION_SELECTOR = "0x29e99f07";
    const MAX_GAS_TO_FORWARD_THAT_FAILS_WITHOUT_ACCESS_LIST = 70605;
    const WRITE_STORAGE_KEYS = [
      bufferToRpcData(toBuffer(0), 32),
      bufferToRpcData(toBuffer(1), 32),
      bufferToRpcData(toBuffer(2), 32),
      bufferToRpcData(toBuffer(3), 32),
      bufferToRpcData(toBuffer(4), 32),
      bufferToRpcData(toBuffer(5), 32),
      bufferToRpcData(toBuffer(6), 32),
      bufferToRpcData(toBuffer(7), 32),
      bufferToRpcData(toBuffer(8), 32),
      bufferToRpcData(toBuffer(9), 32),
      bufferToRpcData(toBuffer(10), 32),
      bufferToRpcData(toBuffer(11), 32),
      bufferToRpcData(toBuffer(12), 32),
      bufferToRpcData(toBuffer(13), 32),
    ];

    function abiEncodeUint(uint: number) {
      return new BN(uint).toBuffer("be", 32).toString("hex");
    }

    let contract: string;
    let txData: any;

    beforeEach(async function () {
      contract = await deployContract(
        this.provider,
        TEST_CONTRACT_DEPLOYMENT_BYTECODE
      );

      txData = {
        to: contract,
        data:
          TEST_FUNCTION_SELECTOR +
          abiEncodeUint(MAX_GAS_TO_FORWARD_THAT_FAILS_WITHOUT_ACCESS_LIST),
        accessList: [
          {
            address: contract,
            storageKeys: WRITE_STORAGE_KEYS,
          },
        ],
      };
    });

    describe("Validate access list test contract", function () {
      it("Should revert if the max gas is forwarded", async function () {
        await assert.isRejected(
          this.provider.send("eth_call", [
            {
              ...txData,
              accessList: undefined,
            },
          ]),
          "reverted without a reason"
        );
      });

      it("Should not revert if the more gas is forwarded", async function () {
        await this.provider.send("eth_call", [
          {
            to: contract,
            data:
              TEST_FUNCTION_SELECTOR +
              abiEncodeUint(
                MAX_GAS_TO_FORWARD_THAT_FAILS_WITHOUT_ACCESS_LIST + 1
              ),
          },
        ]);
      });
    });

    describe("eth_call", function () {
      it("should use the access list if sent", async function () {
        await this.provider.send("eth_call", [txData]);
      });
    });

    describe("eth_estimateGas", function () {
      it("should use the access list if sent", async function () {
        // It would revert and throw if the access list is not used
        await this.provider.send("eth_estimateGas", [txData]);
      });
    });

    describe("eth_sendRawTransaction", function () {
      it("should use the access list if an EIP-2930 tx is sent", async function () {
        const unsignedTx = AccessListEIP2930Transaction.fromTxData(
          { ...txData, gasPrice: 0, gasLimit: 1000000 },
          {
            common: this.common,
          }
        );

        const signedTx = unsignedTx.sign(privateKey);

        const txHash = await this.provider.send("eth_sendRawTransaction", [
          bufferToRpcData(signedTx.serialize()),
        ]);

        const tx = await this.provider.send("eth_getTransactionByHash", [
          txHash,
        ]);

        assert.equal(tx.type, numberToRpcQuantity(1));
      });
    });

    describe("eth_sendTransaction", function () {
      describe("When automining", function () {
        it("Should use an EIP-2930 tx if an access list is sent using a local account", async function () {
          const [from] = await this.provider.send("eth_accounts");
          const txHash = await this.provider.send("eth_sendTransaction", [
            { ...txData, from },
          ]);

          const tx = await this.provider.send("eth_getTransactionByHash", [
            txHash,
          ]);

          assert.equal(tx.type, numberToRpcQuantity(1));
        });

        it("Should use an EIP-2930 tx if an access list is sent using an impersonated account", async function () {
          const from = "0x1234567890123456789012345678901234567890";
          await this.provider.send("hardhat_impersonateAccount", [from]);

          const txHash = await this.provider.send("eth_sendTransaction", [
            { ...txData, from, gasPrice: numberToRpcQuantity(0) },
          ]);

          const tx = await this.provider.send("eth_getTransactionByHash", [
            txHash,
          ]);

          assert.equal(tx.type, numberToRpcQuantity(1));
        });
      });

      describe("When txs go through the mempool", function () {
        beforeEach("Disable automining", async function () {
          await this.provider.send("evm_setAutomine", [false]);
        });

        it("Should use an EIP-2930 tx if an access list is sent using a local account", async function () {
          const [from] = await this.provider.send("eth_accounts");
          const txHash = await this.provider.send("eth_sendTransaction", [
            { ...txData, from },
          ]);

          const pendingTx = await this.provider.send(
            "eth_getTransactionByHash",
            [txHash]
          );

          assert.equal(pendingTx.type, numberToRpcQuantity(1));

          await this.provider.send("evm_mine", []);

          const minedTx = await this.provider.send("eth_getTransactionByHash", [
            txHash,
          ]);

          assert.equal(minedTx.type, numberToRpcQuantity(1));
        });

        it("Should use an EIP-2930 tx if an access list is sent using an impersonated account", async function () {
          const from = "0x1234567890123456789012345678901234567890";
          await this.provider.send("hardhat_impersonateAccount", [from]);

          const txHash = await this.provider.send("eth_sendTransaction", [
            { ...txData, from, gasPrice: numberToRpcQuantity(0) },
          ]);

          const pendingTx = await this.provider.send(
            "eth_getTransactionByHash",
            [txHash]
          );

          assert.equal(pendingTx.type, numberToRpcQuantity(1));

          await this.provider.send("evm_mine", []);

          const minedTx = await this.provider.send("eth_getTransactionByHash", [
            txHash,
          ]);

          assert.equal(minedTx.type, numberToRpcQuantity(1));
        });
      });
    });
  });
});
