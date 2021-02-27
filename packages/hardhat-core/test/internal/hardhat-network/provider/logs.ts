import { assert } from "chai";
import chalk from "chalk";

import { numberToRpcQuantity } from "../../../../src/internal/hardhat-network/provider/output";
import { EXAMPLE_CONTRACT, EXAMPLE_READ_CONTRACT } from "../helpers/contracts";
import { setCWD } from "../helpers/cwd";
import {
  DEFAULT_ACCOUNTS_ADDRESSES,
  DEFAULT_BLOCK_GAS_LIMIT,
  PROVIDERS,
} from "../helpers/providers";
import { deployContract } from "../helpers/transactions";
import { useHelpers } from "../helpers/useHelpers";

// tslint:disable prefer-template

describe("Provider logs", () => {
  PROVIDERS.forEach(({ name, useProvider }) => {
    describe(`${name} provider`, function () {
      setCWD();
      useProvider();
      useHelpers();

      describe("automine enabled without pending txs", function () {
        describe("simple rpc methods", function () {
          it("should log basic methods", async function () {
            await this.provider.send("eth_blockNumber");

            assert.deepEqual(this.logger.lines, [
              chalk.green("eth_blockNumber"),
            ]);
          });

          it("should not log private methods", async function () {
            await this.provider.send("hardhat_getStackTraceFailuresCount", []);
            await this.provider.send("hardhat_setLoggingEnabled", [true]);

            assert.lengthOf(this.logger.lines, 0);
          });

          it("collapse successive calls to the same method", async function () {
            await this.provider.send("eth_blockNumber");
            await this.provider.send("eth_blockNumber");

            assert.deepEqual(this.logger.lines, [
              chalk.green("eth_blockNumber (2)"),
            ]);

            await this.provider.send("eth_blockNumber");

            assert.deepEqual(this.logger.lines, [
              chalk.green("eth_blockNumber (3)"),
            ]);
          });

          it("should stop collapsing when a different method is called", async function () {
            await this.provider.send("eth_blockNumber");
            await this.provider.send("eth_blockNumber");

            assert.deepEqual(this.logger.lines, [
              chalk.green("eth_blockNumber (2)"),
            ]);

            await this.provider.send("eth_accounts");
            await this.provider.send("eth_blockNumber");

            assert.deepEqual(this.logger.lines, [
              chalk.green("eth_blockNumber (2)"),
              chalk.green("eth_accounts"),
              chalk.green("eth_blockNumber"),
            ]);
          });

          it("should work when a failed method is called in the middle", async function () {
            await this.provider.send("eth_blockNumber");
            await this.provider.send("eth_blockNumber");

            assert.deepEqual(this.logger.lines, [
              chalk.green("eth_blockNumber (2)"),
            ]);

            await this.provider.send("eth_nonExistentMethod").catch(() => {});
            await this.provider.send("eth_blockNumber");

            assert.deepEqual(this.logger.lines, [
              chalk.green("eth_blockNumber (2)"),
              chalk.red("eth_nonExistentMethod - Method not supported"),
              chalk.green("eth_blockNumber"),
            ]);
          });
        });

        describe("eth_sendTransaction", function () {
          it("should print a successful transaction", async function () {
            await this.sendTx();

            assert.lengthOf(this.logger.lines, 8);
            assert.equal(
              this.logger.lines[0],
              chalk.green("eth_sendTransaction")
            );
            // prettier-ignore
            {
              assert.match(this.logger.lines[1], /^  Transaction: 0x[0-9a-f]{64}$/);
              assert.match(this.logger.lines[2], /^  From:        0x[0-9a-f]{40}$/);
              assert.match(this.logger.lines[3], /^  To:          0x[0-9a-f]{40}$/);
              assert.match(this.logger.lines[4], /^  Value:       0 ETH$/);
              assert.match(this.logger.lines[5], /^  Gas used:    21000 of \d+$/);
              assert.match(this.logger.lines[6], /^  Block #1:    0x[0-9a-f]{64}$/);
              assert.equal(this.logger.lines[7], "");
            }
          });

          it("should print an OOG transaction", async function () {
            await this.sendTx({
              to: "0x0000000000000000000000000000000000000001",
            }).catch(() => {}); // ignore failure

            assert.lengthOf(this.logger.lines, 11);
            assert.equal(
              this.logger.lines[0],
              chalk.red("eth_sendTransaction")
            );
            // prettier-ignore
            {
              assert.match(this.logger.lines[1], /^  Precompile call: <PrecompileContract 1>$/);
              assert.match(this.logger.lines[2], /^  Transaction:     0x[0-9a-f]{64}$/);
              assert.match(this.logger.lines[3], /^  From:            0x[0-9a-f]{40}$/);
              assert.match(this.logger.lines[4], /^  To:              0x[0-9a-f]{40}$/);
              assert.match(this.logger.lines[5], /^  Value:           0 ETH$/);
              assert.match(this.logger.lines[6], /^  Gas used:        21000 of \d+$/);
              assert.match(this.logger.lines[7], /^  Block #1:        0x[0-9a-f]{64}$/);
              assert.equal(this.logger.lines[8], "");
              assert.match(this.logger.lines[9], /^  Transaction ran out of gas/);
              assert.equal(this.logger.lines[10], "");
            }
          });

          it("should print a contract deployment", async function () {
            await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                data: `0x${EXAMPLE_CONTRACT.bytecode.object}`,
                gas: numberToRpcQuantity(DEFAULT_BLOCK_GAS_LIMIT),
              },
            ]);

            assert.lengthOf(this.logger.lines, 9);
            assert.equal(
              this.logger.lines[0],
              chalk.green("eth_sendTransaction")
            );
            // prettier-ignore
            {
              assert.match(this.logger.lines[1], /^  Contract deployment: <UnrecognizedContract>$/);
              assert.match(this.logger.lines[2], /^  Contract address:    0x[0-9a-f]{40}$/);
              assert.match(this.logger.lines[3], /^  Transaction:         0x[0-9a-f]{64}$/);
              assert.match(this.logger.lines[4], /^  From:                0x[0-9a-f]{40}$/);
              assert.match(this.logger.lines[5], /^  Value:               0 ETH$/);
              assert.match(this.logger.lines[6], /^  Gas used:            \d+ of \d+$/);
              assert.match(this.logger.lines[7], /^  Block #1:            0x[0-9a-f]{64}$/);
              assert.equal(this.logger.lines[8], "");
            }
          });
        });

        describe("eth_sendRawTransaction", function () {
          it("should print a successful transaction", async function () {
            await this.provider.send("eth_sendRawTransaction", [
              "0xf86180018252089494a48723b9b46b19c72e3091838d0522618b9363808082011aa04b42288be5c6bad2a53ebc7dca277d05c4e54912a94b2ecb2565f472e49cc547a01bc01d61ed6d3dbc3de54ad928d83397e5b139a3834c71785c8ac90e85bf42e7",
            ]);

            assert.lengthOf(this.logger.lines, 8);
            assert.equal(
              this.logger.lines[0],
              chalk.green("eth_sendRawTransaction")
            );
            // prettier-ignore
            {
              assert.match(this.logger.lines[1], /^  Transaction: 0x[0-9a-f]{64}$/);
              assert.match(this.logger.lines[2], /^  From:        0x[0-9a-f]{40}$/);
              assert.match(this.logger.lines[3], /^  To:          0x[0-9a-f]{40}$/);
              assert.match(this.logger.lines[4], /^  Value:       0 ETH$/);
              assert.match(this.logger.lines[5], /^  Gas used:    21000 of \d+$/);
              assert.match(this.logger.lines[6], /^  Block #1:    0x[0-9a-f]{64}$/);
              assert.equal(this.logger.lines[7], "");
            }
          });

          it("should print a failed transaction", async function () {
            await deployContract(
              this.provider,
              `0x${EXAMPLE_READ_CONTRACT.bytecode.object}`
            );
            this.logger.reset();

            // this sends a tx with value to a non-payable method of EXAMPLE_READ_CONTRACT
            await this.provider
              .send("eth_sendRawTransaction", [
                "0xf865010182c3509461de9dc6f6cff1df2809480882cfd3c2364b28f7018457e871e7820119a08ac38650d6d0f89ffcc68420928bc75ee96fb5aa11c2c74358cc8a9a6ea82c0aa0203f7c5e2fe374ee89a5c4fd03be7cfbe4bf8e85f293b794c51e049f3b45fa28",
              ])
              .catch(() => {});

            assert.lengthOf(this.logger.lines, 11);
            assert.equal(
              this.logger.lines[0],
              chalk.red("eth_sendRawTransaction")
            );
            // prettier-ignore
            {
              assert.match(this.logger.lines[1], /^  Contract call:       <UnrecognizedContract>$/);
              assert.match(this.logger.lines[2], /^  Transaction:         0x[0-9a-f]{64}$/);
              assert.match(this.logger.lines[3], /^  From:                0x[0-9a-f]{40}$/);
              assert.match(this.logger.lines[4], /^  To:                  0x[0-9a-f]{40}$/);
              assert.match(this.logger.lines[5], /^  Value:               1 wei$/);
              assert.match(this.logger.lines[6], /^  Gas used:            \d+ of \d+$/);
              assert.match(this.logger.lines[7], /^  Block #2:            0x[0-9a-f]{64}$/);
              assert.equal(this.logger.lines[8], "");
              assert.match(this.logger.lines[9], /^  Error: Transaction reverted without a reason/);
              assert.equal(this.logger.lines[10], "");
            }
          });
        });

        describe("eth_call", function () {
          it("should print a successful call", async function () {
            const address = await deployContract(
              this.provider,
              `0x${EXAMPLE_READ_CONTRACT.bytecode.object}`
            );
            this.logger.reset();

            await this.provider.send("eth_call", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: address,
                gas: numberToRpcQuantity(1000000),
                gasPrice: numberToRpcQuantity(1),
                data: EXAMPLE_READ_CONTRACT.selectors.blockNumber,
              },
            ]);

            assert.lengthOf(this.logger.lines, 5);
            assert.equal(this.logger.lines[0], chalk.green("eth_call"));
            // prettier-ignore
            {
              assert.equal(this.logger.lines[1], "  Contract call:       <UnrecognizedContract>");
              assert.equal(this.logger.lines[2], "  From:                0xbe862ad9abfe6f22bcb087716c7d89a26051f74c");
              assert.equal(this.logger.lines[3], "  To:                  0x61de9dc6f6cff1df2809480882cfd3c2364b28f7");
              assert.equal(this.logger.lines[4], "");
            }
          });

          it("should print a failed call", async function () {
            const address = await deployContract(
              this.provider,
              `0x${EXAMPLE_READ_CONTRACT.bytecode.object}`
            );
            this.logger.reset();

            await this.provider
              .send("eth_call", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: address,
                  gas: numberToRpcQuantity(1000000),
                  gasPrice: numberToRpcQuantity(1),
                  data: EXAMPLE_READ_CONTRACT.selectors.blockGasLimit,
                  value: numberToRpcQuantity(1),
                },
              ])
              .catch(() => {});

            assert.lengthOf(this.logger.lines, 8);
            assert.equal(this.logger.lines[0], chalk.red("eth_call"));
            // prettier-ignore
            {
              assert.match(this.logger.lines[1], /^  Contract call:       <UnrecognizedContract>$/);
              assert.match(this.logger.lines[2], /^  From:                0xbe862ad9abfe6f22bcb087716c7d89a26051f74c$/);
              assert.match(this.logger.lines[3], /^  To:                  0x61de9dc6f6cff1df2809480882cfd3c2364b28f7$/);
              assert.match(this.logger.lines[4], /^  Value:               1 wei$/);
              assert.equal(this.logger.lines[5], "");
              assert.match(this.logger.lines[6], /^  Error: Transaction reverted without a reason/);
              assert.equal(this.logger.lines[7], "");
            }
          });

          it("should warn when calling an account that is not a contract", async function () {
            await this.provider.send("eth_call", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: "0x0000000000000000000000000000000000000000",
                gas: numberToRpcQuantity(21000),
                gasPrice: numberToRpcQuantity(1),
              },
            ]);

            assert.lengthOf(this.logger.lines, 5);
            assert.equal(this.logger.lines[0], chalk.green("eth_call"));
            // prettier-ignore
            {
              assert.equal(this.logger.lines[1], "  WARNING: Calling an account which is not a contract");
              assert.equal(this.logger.lines[2], "  From: 0xbe862ad9abfe6f22bcb087716c7d89a26051f74c");
              assert.equal(this.logger.lines[3], "  To:   0x0000000000000000000000000000000000000000");
              assert.equal(this.logger.lines[4], "");
            }
          });
        });

        describe("eth_estimateGas", function () {
          it("shouldn't print anything when the gas estimation is successful", async function () {
            const address = await deployContract(
              this.provider,
              `0x${EXAMPLE_READ_CONTRACT.bytecode.object}`
            );
            this.logger.reset();

            await this.provider.send("eth_estimateGas", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: address,
                gas: numberToRpcQuantity(1000000),
                gasPrice: numberToRpcQuantity(1),
                data: EXAMPLE_READ_CONTRACT.selectors.blockNumber,
              },
            ]);

            assert.lengthOf(this.logger.lines, 1);
            assert.equal(this.logger.lines[0], chalk.green("eth_estimateGas"));
          });

          it("should print extra details when the gas estimation fails", async function () {
            const address = await deployContract(
              this.provider,
              `0x${EXAMPLE_READ_CONTRACT.bytecode.object}`
            );
            this.logger.reset();

            await this.provider
              .send("eth_estimateGas", [
                {
                  from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                  to: address,
                  gas: numberToRpcQuantity(1000000),
                  gasPrice: numberToRpcQuantity(1),
                  data: EXAMPLE_READ_CONTRACT.selectors.blockGasLimit,
                  value: numberToRpcQuantity(1),
                },
              ])
              .catch(() => {});

            assert.lengthOf(this.logger.lines, 8);
            assert.equal(this.logger.lines[0], chalk.red("eth_estimateGas"));
            // prettier-ignore
            {
              assert.match(this.logger.lines[1], /^  Contract call:       <UnrecognizedContract>$/);
              assert.match(this.logger.lines[2], /^  From:                0xbe862ad9abfe6f22bcb087716c7d89a26051f74c$/);
              assert.match(this.logger.lines[3], /^  To:                  0x61de9dc6f6cff1df2809480882cfd3c2364b28f7$/);
              assert.match(this.logger.lines[4], /^  Value:               1 wei$/);
              assert.equal(this.logger.lines[5], "");
              assert.match(this.logger.lines[6], /^  Error: Transaction reverted without a reason/);
              assert.equal(this.logger.lines[7], "");
            }
          });
        });
      });

      describe("automine enabled with pending txs", function () {
        beforeEach(async function () {
          await this.provider.send("evm_setAutomineEnabled", [false]);
          this.logger.reset();
        });

        it("one pending tx, sent tx at the end of the block", async function () {
          await this.sendTx({
            nonce: 0,
          });

          await this.provider.send("evm_setAutomineEnabled", [true]);

          this.logger.reset();

          await this.sendTx({
            nonce: 1,
          });

          assert.equal(
            this.logger.lines[0],
            chalk.green("eth_sendTransaction")
          );
          // prettier-ignore
          {
            assert.match(this.logger.lines[1], /^  There were other pending transactions mined in the same block:$/);
            assert.equal(this.logger.lines[2], "");
            assert.match(this.logger.lines[3], /^  Block #1: 0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[4], /^    Transaction: 0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[5], /^      From:      0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[6], /^      To:        0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[7], /^      Value:     0 ETH$/);
            assert.match(this.logger.lines[8], /^      Gas used:  21000 of 21000$/);
            assert.equal(this.logger.lines[9], "");
            assert.match(this.logger.lines[10], /^    Transaction: \u001b[1m0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[11], /^      From:      0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[12], /^      To:        0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[13], /^      Value:     0 ETH$/);
            assert.match(this.logger.lines[14], /^      Gas used:  21000 of 21000$/);
            assert.equal(this.logger.lines[15], "");
            assert.match(this.logger.lines[16], /^  Currently sent transaction:$/);
            assert.equal(this.logger.lines[17], "");
            assert.match(this.logger.lines[18], /^  Transaction:   0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[19], /^  From:          0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[20], /^  To:            0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[21], /^  Value:         0 ETH$/);
            assert.match(this.logger.lines[22], /^  Gas used:      21000 of 21000$/);
            assert.match(this.logger.lines[23], /^  Block #1:      0x[0-9a-f]{64}/);
            assert.equal(this.logger.lines[24], "");
          }
        });

        it("one pending tx, sent tx at the start of the block", async function () {
          await this.sendTx({
            nonce: 1,
          });

          await this.provider.send("evm_setAutomineEnabled", [true]);

          this.logger.reset();

          await this.sendTx({
            nonce: 0,
          });

          assert.lengthOf(this.logger.lines, 25);
          assert.equal(
            this.logger.lines[0],
            chalk.green("eth_sendTransaction")
          );
          // prettier-ignore
          {
            assert.equal(this.logger.lines[1], "  There were other pending transactions mined in the same block:");
            assert.equal(this.logger.lines[2], "");
            assert.match(this.logger.lines[3], /^  Block #1: 0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[4], /^    Transaction: \u001b[1m0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[5], /^      From:      0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[6], /^      To:        0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[7], /^      Value:     0 ETH$/);
            assert.match(this.logger.lines[8], /^      Gas used:  21000 of 21000$/);
            assert.equal(this.logger.lines[9], "");
            assert.match(this.logger.lines[10], /^    Transaction: 0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[11], /^      From:      0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[12], /^      To:        0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[13], /^      Value:     0 ETH$/);
            assert.match(this.logger.lines[14], /^      Gas used:  21000 of 21000$/);
            assert.equal(this.logger.lines[15], "");
            assert.match(this.logger.lines[16], /^  Currently sent transaction:$/);
            assert.equal(this.logger.lines[17], "");
            assert.match(this.logger.lines[18], /^  Transaction:   0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[19], /^  From:          0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[20], /^  To:            0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[21], /^  Value:         0 ETH$/);
            assert.match(this.logger.lines[22], /^  Gas used:      21000 of 21000$/);
            assert.match(this.logger.lines[23], /^  Block #1:      0x[0-9a-f]{64}/);
            assert.equal(this.logger.lines[24], "");
          }
        });

        it("three pending txs, two txs per block, sent tx in second block", async function () {
          await this.provider.send("evm_setBlockGasLimit", [
            numberToRpcQuantity(45000),
          ]);
          await this.sendTx();
          await this.sendTx();
          await this.sendTx();

          await this.provider.send("evm_setAutomineEnabled", [true]);

          this.logger.reset();

          await this.sendTx();

          assert.lengthOf(this.logger.lines, 38);
          assert.equal(
            this.logger.lines[0],
            chalk.green("eth_sendTransaction")
          );
          // prettier-ignore
          {
            assert.equal(this.logger.lines[1], "  There were other pending transactions. More than one block had to be mined:");
            assert.equal(this.logger.lines[2], "");
            assert.match(this.logger.lines[3], /^  Block #1: 0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[4], /^    Transaction: 0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[5], /^      From:      0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[6], /^      To:        0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[7], /^      Value:     0 ETH$/);
            assert.match(this.logger.lines[8], /^      Gas used:  21000 of 21000$/);
            assert.equal(this.logger.lines[9], "");
            assert.match(this.logger.lines[10], /^    Transaction: 0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[11], /^      From:      0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[12], /^      To:        0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[13], /^      Value:     0 ETH$/);
            assert.match(this.logger.lines[14], /^      Gas used:  21000 of 21000$/);
            assert.equal(this.logger.lines[15], "");
            assert.match(this.logger.lines[16], /^  Block #2: 0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[17], /^    Transaction: 0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[18], /^      From:      0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[19], /^      To:        0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[20], /^      Value:     0 ETH$/);
            assert.match(this.logger.lines[21], /^      Gas used:  21000 of 21000$/);
            assert.equal(this.logger.lines[22], "");
            assert.match(this.logger.lines[23], /^    Transaction: \u001b[1m0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[24], /^      From:      0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[25], /^      To:        0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[26], /^      Value:     0 ETH$/);
            assert.match(this.logger.lines[27], /^      Gas used:  21000 of 21000$/);
            assert.equal(this.logger.lines[28], "");
            assert.match(this.logger.lines[29], /^  Currently sent transaction:$/);
            assert.equal(this.logger.lines[30], "");
            assert.match(this.logger.lines[31], /^  Transaction:   0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[32], /^  From:          0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[33], /^  To:            0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[34], /^  Value:         0 ETH$/);
            assert.match(this.logger.lines[35], /^  Gas used:      21000 of 21000$/);
            assert.match(this.logger.lines[36], /^  Block #2:      0x[0-9a-f]{64}/);
            assert.equal(this.logger.lines[37], "");
          }
        });

        it("three pending txs, two txs per block, sent tx can be mined immediately", async function () {
          await this.provider.send("evm_setBlockGasLimit", [
            numberToRpcQuantity(45000),
          ]);
          await this.sendTx({ nonce: 1 });
          await this.sendTx({ nonce: 2 });
          await this.sendTx({ nonce: 3 });

          await this.provider.send("evm_setAutomineEnabled", [true]);

          this.logger.reset();

          await this.sendTx({ nonce: 0 });

          assert.lengthOf(this.logger.lines, 38);
          assert.equal(
            this.logger.lines[0],
            chalk.green("eth_sendTransaction")
          );
          // prettier-ignore
          {
            assert.equal(this.logger.lines[1], "  There were other pending transactions. More than one block had to be mined:");
            assert.equal(this.logger.lines[2], "");
            assert.match(this.logger.lines[3], /^  Block #1: 0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[4], /^    Transaction: \u001b[1m0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[5], /^      From:      0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[6], /^      To:        0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[7], /^      Value:     0 ETH$/);
            assert.match(this.logger.lines[8], /^      Gas used:  21000 of 21000$/);
            assert.equal(this.logger.lines[9], "");
            assert.match(this.logger.lines[10], /^    Transaction: 0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[11], /^      From:      0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[12], /^      To:        0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[13], /^      Value:     0 ETH$/);
            assert.match(this.logger.lines[14], /^      Gas used:  21000 of 21000$/);
            assert.equal(this.logger.lines[15], "");
            assert.match(this.logger.lines[16], /^  Block #2: 0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[17], /^    Transaction: 0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[18], /^      From:      0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[19], /^      To:        0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[20], /^      Value:     0 ETH$/);
            assert.match(this.logger.lines[21], /^      Gas used:  21000 of 21000$/);
            assert.equal(this.logger.lines[22], "");
            assert.match(this.logger.lines[23], /^    Transaction: 0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[24], /^      From:      0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[25], /^      To:        0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[26], /^      Value:     0 ETH$/);
            assert.match(this.logger.lines[27], /^      Gas used:  21000 of 21000$/);
            assert.equal(this.logger.lines[28], "");
            assert.match(this.logger.lines[29], /^  Currently sent transaction:$/);
            assert.equal(this.logger.lines[30], "");
            assert.match(this.logger.lines[31], /^  Transaction:   0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[32], /^  From:          0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[33], /^  To:            0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[34], /^  Value:         0 ETH$/);
            assert.match(this.logger.lines[35], /^  Gas used:      21000 of 21000$/);
            assert.match(this.logger.lines[36], /^  Block #1:      0x[0-9a-f]{64}/);
            assert.equal(this.logger.lines[37], "");
          }
        });

        it("should show the stack trace in the block list and at the end", async function () {
          await this.provider.send("evm_setAutomineEnabled", [true]);
          const address = await deployContract(
            this.provider,
            `0x${EXAMPLE_READ_CONTRACT.bytecode.object}`
          );
          await this.provider.send("evm_setAutomineEnabled", [false]);

          await this.sendTx();

          await this.provider.send("evm_setAutomineEnabled", [true]);
          this.logger.reset();

          await this.sendTx({
            to: address,
            gas: 1000000,
            data: EXAMPLE_READ_CONTRACT.selectors.blockGasLimit,
            value: 1,
          }).catch(() => {});

          assert.lengthOf(this.logger.lines, 31);
          assert.equal(this.logger.lines[0], chalk.red("eth_sendTransaction"));
          // prettier-ignore
          {
            assert.equal(this.logger.lines[ 1], "  There were other pending transactions mined in the same block:");
            assert.equal(this.logger.lines[ 2], "");
            assert.match(this.logger.lines[ 3], /^  Block #2: 0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[ 4], /^    Transaction:       0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[ 5], /^      From:            0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[ 6], /^      To:              0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[ 7], /^      Value:           0 ETH$/);
            assert.match(this.logger.lines[ 8], /^      Gas used:        21000 of 21000$/);
            assert.equal(this.logger.lines[ 9], "");
            assert.match(this.logger.lines[10], /^    Transaction:       \u001b[1m0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[11], /^      Contract call:   <UnrecognizedContract>/);
            assert.match(this.logger.lines[12], /^      From:            0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[13], /^      To:              0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[14], /^      Value:           1 wei$/);
            assert.match(this.logger.lines[15], /^      Gas used:        21109 of 1000000$/);
            assert.equal(this.logger.lines[16], "");
            assert.match(this.logger.lines[17], /^      Error: Transaction reverted without a reason/);
            assert.equal(this.logger.lines[18], "");
            assert.match(this.logger.lines[19], /^  Currently sent transaction:$/);
            assert.equal(this.logger.lines[20], "");
            assert.match(this.logger.lines[21], /^  Contract call:       <UnrecognizedContract>/);
            assert.match(this.logger.lines[22], /^  Transaction:         0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[23], /^  From:                0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[24], /^  To:                  0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[25], /^  Value:               1 wei$/);
            assert.match(this.logger.lines[26], /^  Gas used:            21109 of 1000000$/);
            assert.match(this.logger.lines[27], /^  Block #2:            0x[0-9a-f]{64}/);
            assert.equal(this.logger.lines[28], "");
            assert.match(this.logger.lines[29], /^  Error: Transaction reverted without a reason/);
            assert.equal(this.logger.lines[30], "");
          }
        });
      });

      describe("hardhat_intervalMine", function () {
        beforeEach(async function () {
          await this.provider.send("evm_setAutomineEnabled", [false]);
          this.logger.reset();
        });

        it("should only print the mined block when there are no pending txs", async function () {
          await this.provider.send("hardhat_intervalMine", []);

          assert.lengthOf(this.logger.lines, 1);
          assert.equal(this.logger.lines[0], "Mined empty block #1");
        });

        it("should collapse the mined block info", async function () {
          await this.provider.send("hardhat_intervalMine", []);
          await this.provider.send("hardhat_intervalMine", []);

          assert.lengthOf(this.logger.lines, 1);
          assert.equal(
            this.logger.lines[0],
            "Mined empty block range #1 to #2"
          );
        });

        it("should stop collapsing when a different method is called", async function () {
          await this.provider.send("hardhat_intervalMine", []);
          await this.provider.send("hardhat_intervalMine", []);
          await this.provider.send("eth_blockNumber");
          await this.provider.send("hardhat_intervalMine", []);

          assert.lengthOf(this.logger.lines, 3);
          assert.equal(
            this.logger.lines[0],
            "Mined empty block range #1 to #2"
          );
          assert.equal(this.logger.lines[1], chalk.green("eth_blockNumber"));
          assert.equal(this.logger.lines[2], "Mined empty block #3");
        });

        it("should print a block with one transaction", async function () {
          await this.sendTx();

          this.logger.reset();

          await this.provider.send("hardhat_intervalMine", []);

          assert.lengthOf(this.logger.lines, 8);
          // prettier-ignore
          {
            assert.match(this.logger.lines[0], /^Mined block #1$/);
            assert.match(this.logger.lines[1], /^  Block: 0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[2], /^    Transaction: 0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[3], /^      From:      0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[4], /^      To:        0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[5], /^      Value:     0 ETH$/);
            assert.match(this.logger.lines[6], /^      Gas used:  21000 of 21000$/);
            assert.equal(this.logger.lines[7], "");
          }
        });

        it("should print a block with two transactions", async function () {
          await this.sendTx();
          await this.sendTx();

          this.logger.reset();

          await this.provider.send("hardhat_intervalMine", []);

          assert.lengthOf(this.logger.lines, 14);
          // prettier-ignore
          {
            assert.match(this.logger.lines[0], /^Mined block #1$/);
            assert.match(this.logger.lines[1 ], /^  Block: 0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[2 ], /^    Transaction: 0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[3 ], /^      From:      0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[4 ], /^      To:        0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[5 ], /^      Value:     0 ETH$/);
            assert.match(this.logger.lines[6 ], /^      Gas used:  21000 of 21000$/);
            assert.equal(this.logger.lines[7 ], "");
            assert.match(this.logger.lines[8 ], /^    Transaction: 0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[9 ], /^      From:      0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[10], /^      To:        0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[11], /^      Value:     0 ETH$/);
            assert.match(this.logger.lines[12], /^      Gas used:  21000 of 21000$/);
            assert.equal(this.logger.lines[13], "");
          }
        });

        it("should print stack traces", async function () {
          await this.provider.send("evm_setAutomineEnabled", [true]);
          const address = await deployContract(
            this.provider,
            `0x${EXAMPLE_READ_CONTRACT.bytecode.object}`
          );
          await this.provider.send("evm_setAutomineEnabled", [false]);

          await this.sendTx();
          await this.sendTx({
            to: address,
            gas: 1000000,
            data: EXAMPLE_READ_CONTRACT.selectors.blockGasLimit,
            value: 1,
          }).catch(() => {});

          this.logger.reset();

          await this.provider.send("hardhat_intervalMine", []);

          assert.lengthOf(this.logger.lines, 17);
          // prettier-ignore
          {
            assert.match(this.logger.lines[0], /^Mined block #2$/);
            assert.match(this.logger.lines[1 ], /^  Block: 0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[2 ], /^    Transaction:       0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[3 ], /^      From:            0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[4 ], /^      To:              0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[5 ], /^      Value:           0 ETH$/);
            assert.match(this.logger.lines[6 ], /^      Gas used:        21000 of 21000$/);
            assert.equal(this.logger.lines[7 ], "");
            assert.match(this.logger.lines[8 ], /^    Transaction:       0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[9 ], /^      Contract call:   <UnrecognizedContract>$/);
            assert.match(this.logger.lines[10], /^      From:            0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[11], /^      To:              0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[12], /^      Value:           1 wei$/);
            assert.match(this.logger.lines[13], /^      Gas used:        21109 of 1000000$/);
            assert.equal(this.logger.lines[14], "");
            assert.match(this.logger.lines[15], /^      Error: Transaction reverted without a reason/);
            assert.equal(this.logger.lines[16], "");
          }
        });
      });

      describe("evm_mine", function () {
        beforeEach(async function () {
          await this.provider.send("evm_setAutomineEnabled", [false]);
          this.logger.reset();
        });

        it("should only print the mined block when there are no pending txs", async function () {
          await this.provider.send("evm_mine", []);

          assert.lengthOf(this.logger.lines, 3);
          assert.equal(this.logger.lines[0], chalk.green("evm_mine"));
          assert.equal(this.logger.lines[1], "  Mined empty block #1");
          assert.equal(this.logger.lines[2], "");
        });

        it("shouldn't collapse successive calls", async function () {
          await this.provider.send("evm_mine", []);
          await this.provider.send("evm_mine", []);

          assert.lengthOf(this.logger.lines, 6);
          assert.equal(this.logger.lines[0], chalk.green("evm_mine"));
          assert.equal(this.logger.lines[1], "  Mined empty block #1");
          assert.equal(this.logger.lines[2], "");
          assert.equal(this.logger.lines[3], chalk.green("evm_mine"));
          assert.equal(this.logger.lines[4], "  Mined empty block #2");
          assert.equal(this.logger.lines[5], "");
        });

        it("should print a block with one transaction", async function () {
          await this.sendTx();

          this.logger.reset();

          await this.provider.send("evm_mine", []);

          assert.lengthOf(this.logger.lines, 9);
          assert.equal(this.logger.lines[0], chalk.green("evm_mine"));
          // prettier-ignore
          {
            assert.match(this.logger.lines[1], /^  Mined block #1$/);
            assert.match(this.logger.lines[2], /^    Block: 0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[3], /^      Transaction: 0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[4], /^        From:      0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[5], /^        To:        0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[6], /^        Value:     0 ETH$/);
            assert.match(this.logger.lines[7], /^        Gas used:  21000 of 21000$/);
            assert.equal(this.logger.lines[8], "");
          }
        });

        it("should print a block with two transactions", async function () {
          await this.sendTx();
          await this.sendTx();

          this.logger.reset();

          await this.provider.send("evm_mine", []);

          assert.lengthOf(this.logger.lines, 15);
          assert.equal(this.logger.lines[0], chalk.green("evm_mine"));
          // prettier-ignore
          {
            assert.match(this.logger.lines[1 ], /^  Mined block #1$/);
            assert.match(this.logger.lines[2 ], /^    Block: 0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[3 ], /^      Transaction: 0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[4 ], /^        From:      0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[5 ], /^        To:        0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[6 ], /^        Value:     0 ETH$/);
            assert.match(this.logger.lines[7 ], /^        Gas used:  21000 of 21000$/);
            assert.equal(this.logger.lines[8 ], "");
            assert.match(this.logger.lines[9 ], /^      Transaction: 0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[10], /^        From:      0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[11], /^        To:        0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[12], /^        Value:     0 ETH$/);
            assert.match(this.logger.lines[13], /^        Gas used:  21000 of 21000$/);
            assert.equal(this.logger.lines[14], "");
          }
        });

        it("should print stack traces", async function () {
          await this.provider.send("evm_setAutomineEnabled", [true]);
          const address = await deployContract(
            this.provider,
            `0x${EXAMPLE_READ_CONTRACT.bytecode.object}`
          );
          await this.provider.send("evm_setAutomineEnabled", [false]);

          await this.sendTx();
          await this.sendTx({
            to: address,
            gas: 1000000,
            data: EXAMPLE_READ_CONTRACT.selectors.blockGasLimit,
            value: 1,
          }).catch(() => {});

          this.logger.reset();

          await this.provider.send("evm_mine", []);

          assert.lengthOf(this.logger.lines, 18);
          assert.equal(this.logger.lines[0], chalk.green("evm_mine"));
          // prettier-ignore
          {
            assert.match(this.logger.lines[1 ], /^  Mined block #2$/);
            assert.match(this.logger.lines[2 ], /^    Block: 0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[3 ], /^      Transaction:     0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[4 ], /^        From:          0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[5 ], /^        To:            0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[6 ], /^        Value:         0 ETH$/);
            assert.match(this.logger.lines[7 ], /^        Gas used:      21000 of 21000$/);
            assert.equal(this.logger.lines[8 ], "");
            assert.match(this.logger.lines[9 ], /^      Transaction:     0x[0-9a-f]{64}/);
            assert.match(this.logger.lines[10], /^        Contract call: <UnrecognizedContract>$/);
            assert.match(this.logger.lines[11], /^        From:          0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[12], /^        To:            0x[0-9a-f]{40}/);
            assert.match(this.logger.lines[13], /^        Value:         1 wei$/);
            assert.match(this.logger.lines[14], /^        Gas used:      21109 of 1000000$/);
            assert.equal(this.logger.lines[15], "");
            assert.match(this.logger.lines[16], /^        Error: Transaction reverted without a reason/);
            assert.equal(this.logger.lines[17], "");
          }
        });
      });
    });
  });
});
