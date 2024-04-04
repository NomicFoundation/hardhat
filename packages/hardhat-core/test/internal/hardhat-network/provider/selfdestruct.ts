import { assert } from "chai";
import { ethers } from "ethers";

import {
  assertContractFieldEqualNumber,
  assertEqualCode,
} from "../helpers/assertions";
import {
  CALL_SELFDESTRUCT_CONTRACT,
  SELFDESTRUCT_CONTRACT,
  SELFDESTRUCT_DEPLOY_CONTRACT,
} from "../helpers/contracts";
import { setCWD } from "../helpers/cwd";
import { DEFAULT_ACCOUNTS_ADDRESSES, PROVIDERS } from "../helpers/providers";
import { deployContract } from "../helpers/transactions";

describe("selfdestruct", function () {
  PROVIDERS.forEach(({ name, useProvider }) => {
    describe(`${name} provider`, function () {
      setCWD();

      describe("When in a pre-cancun hardfork", function () {
        useProvider({ hardfork: "shanghai" });

        it("should transfer balance", async function () {
          const receiverAddress = "0x755113a7411e8788db98d9d74faf2750fb5570a4";

          const contractAddress = await deployContract(
            this.provider,
            `0x${SELFDESTRUCT_CONTRACT.bytecode.object}`,
            DEFAULT_ACCOUNTS_ADDRESSES[1],
            1000
          );

          // self destruct contract and send funds to some address
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: contractAddress,
              data: `${
                SELFDESTRUCT_CONTRACT.selectors.sd
              }000000000000000000000000${receiverAddress.slice(2)}`,
            },
          ]);

          const contractAddressBalance = await this.provider.send(
            "eth_getBalance",
            [contractAddress]
          );
          const receiverAddressBalance = await this.provider.send(
            "eth_getBalance",
            [receiverAddress]
          );

          assert.equal(BigInt(contractAddressBalance), 0n);
          assert.equal(BigInt(receiverAddressBalance), 1000n);
        });

        it("shouldn't have code or balance after selfdestructing", async function () {
          const receiverAddress = "0x755113a7411e8788db98d9d74faf2750fb5570a4";

          const contractAddress = await deployContract(
            this.provider,
            `0x${SELFDESTRUCT_CONTRACT.bytecode.object}`,
            DEFAULT_ACCOUNTS_ADDRESSES[1],
            1000
          );

          // self destruct contract and send funds to some address
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[1],
              to: contractAddress,
              data: `${
                SELFDESTRUCT_CONTRACT.selectors.sd
              }000000000000000000000000${receiverAddress.slice(2)}`,
            },
          ]);

          const contractBalance = await this.provider.send("eth_getBalance", [
            contractAddress,
          ]);
          const contractCode = await this.provider.send("eth_getCode", [
            contractAddress,
          ]);

          assert.equal(BigInt(contractBalance), 0n);
          assert.equal(contractCode, "0x");
        });

        it("within the transaction, should have code after selfdestructing but no balance", async function () {
          const receiverAddress = "0x755113a7411e8788db98d9d74faf2750fb5570a4";

          // the constructor of this contract deploys a SelfDestruct contract, and
          // records its code length and balance before and after making it
          // selfdestruct
          const contractAddress = await deployContract(
            this.provider,
            `0x${
              CALL_SELFDESTRUCT_CONTRACT.bytecode.object
            }000000000000000000000000${receiverAddress.slice(2)}`,
            DEFAULT_ACCOUNTS_ADDRESSES[1],
            1000
          );

          // check contract state within tx
          const {
            balanceBeforeSelfDestruct,
            balanceAfterSelfDestruct,
            receiverBalanceBeforeSelfDestruct,
            receiverBalanceAfterSelfDestruct,
            codeLengthBeforeSelfDestruct,
            codeLengthAfterSelfDestruct,
          } = CALL_SELFDESTRUCT_CONTRACT.selectors;

          // before selfdestruct
          await assertContractFieldEqualNumber(
            this.provider,
            contractAddress,
            balanceBeforeSelfDestruct,
            1000n
          );
          await assertContractFieldEqualNumber(
            this.provider,
            contractAddress,
            receiverBalanceBeforeSelfDestruct,
            0n
          );
          await assertContractFieldEqualNumber(
            this.provider,
            contractAddress,
            codeLengthBeforeSelfDestruct,
            280n
          );

          // after selfdestruct
          await assertContractFieldEqualNumber(
            this.provider,
            contractAddress,
            balanceAfterSelfDestruct,
            0n
          );
          await assertContractFieldEqualNumber(
            this.provider,
            contractAddress,
            receiverBalanceAfterSelfDestruct,
            1000n
          );
          await assertContractFieldEqualNumber(
            this.provider,
            contractAddress,
            codeLengthAfterSelfDestruct,
            280n // the code is not immediately removed
          );

          // check conditions after tx
          let selfDestructAddress = await this.provider.send("eth_call", [
            {
              to: contractAddress,
              data: `${CALL_SELFDESTRUCT_CONTRACT.selectors.selfDestruct}`,
            },
          ]);
          selfDestructAddress = `0x${selfDestructAddress.slice(-40)}`; // unpad address

          const contractBalanceAfterTx = await this.provider.send(
            "eth_getBalance",
            [selfDestructAddress]
          );
          const contractCodeAfterTx = await this.provider.send("eth_getCode", [
            selfDestructAddress,
          ]);
          const receiverAddressBalanceAfterTx = await this.provider.send(
            "eth_getBalance",
            [receiverAddress]
          );

          assert.equal(BigInt(contractBalanceAfterTx), 0n);
          assert.equal(contractCodeAfterTx, "0x");
          assert.equal(BigInt(receiverAddressBalanceAfterTx), 1000n);
        });

        describe("when selfdestructing during a deployment", function () {
          it("should delete the code, storage and nonce", async function () {
            const receiverAddress =
              "0x755113a7411e8788db98d9d74faf2750fb5570a4";

            const abiCoder = new ethers.AbiCoder();
            const constructorParameters = abiCoder
              .encode(["address"], [receiverAddress])
              .slice(2);

            const contractAddress = await deployContract(
              this.provider,
              `0x${SELFDESTRUCT_DEPLOY_CONTRACT.bytecode.object}${constructorParameters}`,
              DEFAULT_ACCOUNTS_ADDRESSES[1],
              1000
            );

            const contractCode = await this.provider.send("eth_getCode", [
              contractAddress,
            ]);
            assert.equal(contractCode, "0x");

            const storage = await this.provider.send("eth_getStorageAt", [
              contractAddress,
              "0x0",
            ]);
            assert.equal(BigInt(storage), 0n);

            const nonce = await this.provider.send("eth_getTransactionCount", [
              contractAddress,
            ]);
            assert.equal(nonce, "0x0");
          });

          it("should transfer the balance", async function () {
            const receiverAddress =
              "0x755113a7411e8788db98d9d74faf2750fb5570a4";

            const abiCoder = new ethers.AbiCoder();
            const constructorParameters = abiCoder
              .encode(["address"], [receiverAddress])
              .slice(2);

            const contractAddress = await deployContract(
              this.provider,
              `0x${SELFDESTRUCT_DEPLOY_CONTRACT.bytecode.object}${constructorParameters}`,
              DEFAULT_ACCOUNTS_ADDRESSES[1],
              1000
            );

            const contractAddressBalance = await this.provider.send(
              "eth_getBalance",
              [contractAddress]
            );
            const receiverAddressBalance = await this.provider.send(
              "eth_getBalance",
              [receiverAddress]
            );

            assert.equal(BigInt(contractAddressBalance), 0n);
            assert.equal(BigInt(receiverAddressBalance), 1000n);
          });

          it("should end with a balance of 0 if the target of the transfer is the contract itself", async function () {
            const abiCoder = new ethers.AbiCoder();
            const constructorParameters = abiCoder
              .encode(["address"], [DEFAULT_ACCOUNTS_ADDRESSES[1]])
              .slice(2);

            const contractAddress = await deployContract(
              this.provider,
              `0x${SELFDESTRUCT_DEPLOY_CONTRACT.bytecode.object}${constructorParameters}`,
              DEFAULT_ACCOUNTS_ADDRESSES[1],
              1000
            );

            const contractAddressBalance = await this.provider.send(
              "eth_getBalance",
              [contractAddress]
            );

            assert.equal(BigInt(contractAddressBalance), 0n);
          });
        });

        it("a selfdestruct shouldn't affect another account with the same code", async function () {
          // deploy two contracts with the same bytecode
          const contractAddress1 = await deployContract(
            this.provider,
            `0x${SELFDESTRUCT_CONTRACT.bytecode.object}`,
            DEFAULT_ACCOUNTS_ADDRESSES[0]
          );
          const contractAddress2 = await deployContract(
            this.provider,
            `0x${SELFDESTRUCT_CONTRACT.bytecode.object}`,
            DEFAULT_ACCOUNTS_ADDRESSES[0]
          );

          await assertEqualCode(
            this.provider,
            contractAddress1,
            contractAddress2
          );

          // call self-destruct in one of them
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: contractAddress1,
              data: `${SELFDESTRUCT_CONTRACT.selectors.sd}0000000000000000000000000000000000000000000000000000000000000000`,
            },
          ]);

          // check that the first contract doesn't have code but the second one
          // does
          const contractCode1 = await this.provider.send("eth_getCode", [
            contractAddress1,
          ]);
          assert.equal(contractCode1, "0x");

          const contractCode2 = await this.provider.send("eth_getCode", [
            contractAddress2,
          ]);
          assert.notEqual(contractCode2, "0x");
        });
      });

      describe("When in the cancun hardfork", function () {
        useProvider({ hardfork: "cancun" });

        describe("when calling a function that selfdestructs", function () {
          it("shouldn't delete the code, the storage or the nonce", async function () {
            const receiverAddress =
              "0x755113a7411e8788db98d9d74faf2750fb5570a4";

            const contractAddress = await deployContract(
              this.provider,
              `0x${SELFDESTRUCT_CONTRACT.bytecode.object}`,
              DEFAULT_ACCOUNTS_ADDRESSES[1],
              1000
            );

            // self destruct contract and send funds to some address
            await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                to: contractAddress,
                data: `${
                  SELFDESTRUCT_CONTRACT.selectors.sd
                }000000000000000000000000${receiverAddress.slice(2)}`,
              },
            ]);

            const contractCode = await this.provider.send("eth_getCode", [
              contractAddress,
            ]);
            assert.notEqual(contractCode, "0x");

            const storage = await this.provider.send("eth_getStorageAt", [
              contractAddress,
              "0x0",
            ]);
            assert.equal(BigInt(storage), 1n);

            const nonce = await this.provider.send("eth_getTransactionCount", [
              contractAddress,
            ]);
            assert.equal(nonce, "0x1");
          });

          it("should transfer the balance", async function () {
            const receiverAddress =
              "0x755113a7411e8788db98d9d74faf2750fb5570a4";

            const contractAddress = await deployContract(
              this.provider,
              `0x${SELFDESTRUCT_CONTRACT.bytecode.object}`,
              DEFAULT_ACCOUNTS_ADDRESSES[1],
              1000
            );

            // self destruct contract and send funds to some address
            await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                to: contractAddress,
                data: `${
                  SELFDESTRUCT_CONTRACT.selectors.sd
                }000000000000000000000000${receiverAddress.slice(2)}`,
              },
            ]);

            const contractAddressBalance = await this.provider.send(
              "eth_getBalance",
              [contractAddress]
            );
            const receiverAddressBalance = await this.provider.send(
              "eth_getBalance",
              [receiverAddress]
            );

            assert.equal(BigInt(contractAddressBalance), 0n);
            assert.equal(BigInt(receiverAddressBalance), 1000n);
          });

          it("shouldn't change the balance if the target of the transfer is the contract itself", async function () {
            const contractAddress = await deployContract(
              this.provider,
              `0x${SELFDESTRUCT_CONTRACT.bytecode.object}`,
              DEFAULT_ACCOUNTS_ADDRESSES[1],
              1000
            );

            // self destruct contract and send funds to some address
            await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[1],
                to: contractAddress,
                data: `${
                  SELFDESTRUCT_CONTRACT.selectors.sd
                }000000000000000000000000${contractAddress.slice(2)}`,
              },
            ]);

            const contractAddressBalance = await this.provider.send(
              "eth_getBalance",
              [contractAddress]
            );

            assert.equal(BigInt(contractAddressBalance), 1000n);
          });
        });

        describe("when selfdestructing during a deployment", function () {
          it("should delete the code, storage and nonce", async function () {
            const receiverAddress =
              "0x755113a7411e8788db98d9d74faf2750fb5570a4";

            const abiCoder = new ethers.AbiCoder();
            const constructorParameters = abiCoder
              .encode(["address"], [receiverAddress])
              .slice(2);

            const contractAddress = await deployContract(
              this.provider,
              `0x${SELFDESTRUCT_DEPLOY_CONTRACT.bytecode.object}${constructorParameters}`,
              DEFAULT_ACCOUNTS_ADDRESSES[1],
              1000
            );

            const contractCode = await this.provider.send("eth_getCode", [
              contractAddress,
            ]);
            assert.equal(contractCode, "0x");

            const storage = await this.provider.send("eth_getStorageAt", [
              contractAddress,
              "0x0",
            ]);
            assert.equal(BigInt(storage), 0n);

            const nonce = await this.provider.send("eth_getTransactionCount", [
              contractAddress,
            ]);
            assert.equal(nonce, "0x0");
          });

          it("should transfer the balance", async function () {
            const receiverAddress =
              "0x755113a7411e8788db98d9d74faf2750fb5570a4";

            const abiCoder = new ethers.AbiCoder();
            const constructorParameters = abiCoder
              .encode(["address"], [receiverAddress])
              .slice(2);

            const contractAddress = await deployContract(
              this.provider,
              `0x${SELFDESTRUCT_DEPLOY_CONTRACT.bytecode.object}${constructorParameters}`,
              DEFAULT_ACCOUNTS_ADDRESSES[1],
              1000
            );

            const contractAddressBalance = await this.provider.send(
              "eth_getBalance",
              [contractAddress]
            );
            const receiverAddressBalance = await this.provider.send(
              "eth_getBalance",
              [receiverAddress]
            );

            assert.equal(BigInt(contractAddressBalance), 0n);
            assert.equal(BigInt(receiverAddressBalance), 1000n);
          });

          it("should end with a balance of 0 if the target of the transfer is the contract itself", async function () {
            const abiCoder = new ethers.AbiCoder();
            const constructorParameters = abiCoder
              .encode(["address"], [DEFAULT_ACCOUNTS_ADDRESSES[1]])
              .slice(2);

            const contractAddress = await deployContract(
              this.provider,
              `0x${SELFDESTRUCT_DEPLOY_CONTRACT.bytecode.object}${constructorParameters}`,
              DEFAULT_ACCOUNTS_ADDRESSES[1],
              1000
            );

            const contractAddressBalance = await this.provider.send(
              "eth_getBalance",
              [contractAddress]
            );

            assert.equal(BigInt(contractAddressBalance), 0n);
          });
        });
      });
    });
  });
});
