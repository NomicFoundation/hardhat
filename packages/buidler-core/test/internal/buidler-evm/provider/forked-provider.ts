import { assert } from "chai";
import { BN, bufferToHex, toBuffer } from "ethereumjs-util";
// tslint:disable-next-line:no-implicit-dependencies
import { Contract, utils, Wallet } from "ethers";

import { InvalidInputError } from "../../../../src/internal/buidler-evm/provider/errors";
import { numberToRpcQuantity } from "../../../../src/internal/buidler-evm/provider/output";
import ERC20Abi from "../abi/ERC20/ERC20.json";
import UniswapExchangeAbi from "../abi/Uniswap/Exchange.json";
import UniswapFactoryAbi from "../abi/Uniswap/Factory.json";
import {
  assertQuantity,
  assertTransactionFailure,
} from "../helpers/assertions";
import {
  BITFINEX_WALLET_ADDRESS,
  BLOCK_NUMBER_OF_10496585,
  DAI_ADDRESS,
  EMPTY_ACCOUNT_ADDRESS,
  FIRST_TX_HASH_OF_10496585,
  UNISWAP_FACTORY_ADDRESS,
  WETH_ADDRESS,
} from "../helpers/constants";
import {
  dataToBN,
  quantityToBN,
  quantityToNumber,
} from "../helpers/conversions";
import { setCWD } from "../helpers/cwd";
import { EthersProviderWrapper } from "../helpers/ethers-provider-wrapper";
import { hexStripZeros } from "../helpers/hexStripZeros";
import { leftPad32 } from "../helpers/leftPad32";
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_ACCOUNTS_ADDRESSES,
  FORKED_PROVIDERS,
} from "../helpers/providers";

const WETH_DEPOSIT_SELECTOR = "0xd0e30db0";

describe("Forked provider", () => {
  FORKED_PROVIDERS.forEach(({ rpcProvider, useProvider, jsonRpcUrl }) => {
    describe(`Using ${rpcProvider}`, () => {
      before(function () {
        if (process.env.CI === "true" && rpcProvider === "Alchemy") {
          this.skip();
        }
      });

      setCWD();
      useProvider();

      describe("eth_blockNumber", () => {
        it("returns the current block number", async function () {
          const blockNumber = await this.provider.send("eth_blockNumber");
          const minBlockNumber = 10494745; // mainnet block number at 20.07.2020
          assert.isAtLeast(quantityToNumber(blockNumber), minBlockNumber);
        });
      });

      describe("eth_call", function () {
        it("can get DAI total supply", async function () {
          const daiTotalSupplySelector = "0x18160ddd";
          const result = await this.provider.send("eth_call", [
            { to: bufferToHex(DAI_ADDRESS), data: daiTotalSupplySelector },
          ]);

          const bnResult = new BN(toBuffer(result));
          assert.isTrue(bnResult.gtn(0));
        });
      });

      describe("eth_getBalance", function () {
        it("can get the balance of the WETH contract", async function () {
          const result = await this.provider.send("eth_getBalance", [
            bufferToHex(WETH_ADDRESS),
          ]);
          assert.isTrue(quantityToBN(result).gtn(0));
        });
      });

      describe("eth_sendTransaction", () => {
        it("supports Ether transfers to remote accounts", async function () {
          const result = await this.provider.send("eth_getBalance", [
            bufferToHex(BITFINEX_WALLET_ADDRESS),
          ]);
          const initialBalance = quantityToBN(result);
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: bufferToHex(BITFINEX_WALLET_ADDRESS),
              value: numberToRpcQuantity(100),
              gas: numberToRpcQuantity(21000),
              gasPrice: numberToRpcQuantity(1),
            },
          ]);
          const balance = await this.provider.send("eth_getBalance", [
            bufferToHex(BITFINEX_WALLET_ADDRESS),
          ]);
          assertQuantity(balance, initialBalance.addn(100));
        });

        it("supports wrapping of Ether", async function () {
          const wethBalanceOfSelector = `0x70a08231${leftPad32(
            DEFAULT_ACCOUNTS_ADDRESSES[0]
          )}`;

          const getWrappedBalance = async () =>
            dataToBN(
              await this.provider.send("eth_call", [
                { to: bufferToHex(WETH_ADDRESS), data: wethBalanceOfSelector },
              ])
            );

          const initialBalance = await getWrappedBalance();
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: bufferToHex(WETH_ADDRESS),
              data: WETH_DEPOSIT_SELECTOR,
              value: numberToRpcQuantity(100),
              gas: numberToRpcQuantity(50000),
              gasPrice: numberToRpcQuantity(1),
            },
          ]);
          const balance = await getWrappedBalance();
          assert.equal(
            balance.toString("hex"),
            initialBalance.addn(100).toString("hex")
          );
        });
      });

      describe("eth_getTransactionByHash", () => {
        it("supports local transactions", async function () {
          const transactionHash = await this.provider.send(
            "eth_sendTransaction",
            [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                value: numberToRpcQuantity(1),
                gas: numberToRpcQuantity(21000),
                gasPrice: numberToRpcQuantity(1),
              },
            ]
          );

          const transaction = await this.provider.send(
            "eth_getTransactionByHash",
            [transactionHash]
          );

          assert.equal(transaction.from, DEFAULT_ACCOUNTS_ADDRESSES[0]);
          assert.equal(transaction.to, DEFAULT_ACCOUNTS_ADDRESSES[1]);
          assert.equal(transaction.value, numberToRpcQuantity(1));
          assert.equal(transaction.gas, numberToRpcQuantity(21000));
          assert.equal(transaction.gasPrice, numberToRpcQuantity(1));
        });

        it("supports remote transactions", async function () {
          const transaction = await this.provider.send(
            "eth_getTransactionByHash",
            [bufferToHex(FIRST_TX_HASH_OF_10496585)]
          );

          assert.equal(
            transaction.from,
            "0x4e87582f5e48f3e505b7d3b544972399ad9f2e5f"
          );
          assert.equal(
            transaction.to,
            "0xdac17f958d2ee523a2206206994597c13d831ec7"
          );
        });
      });

      describe("eth_getTransactionReceipt", () => {
        it("supports local transactions", async function () {
          const transactionHash = await this.provider.send(
            "eth_sendTransaction",
            [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                value: numberToRpcQuantity(1),
                gas: numberToRpcQuantity(21000),
                gasPrice: numberToRpcQuantity(1),
              },
            ]
          );

          const receipt = await this.provider.send(
            "eth_getTransactionReceipt",
            [transactionHash]
          );

          assert.equal(receipt.from, DEFAULT_ACCOUNTS_ADDRESSES[0]);
          assert.equal(receipt.to, DEFAULT_ACCOUNTS_ADDRESSES[1]);
          assert.equal(receipt.gasUsed, numberToRpcQuantity(21000));
        });

        it("supports remote transactions", async function () {
          const receipt = await this.provider.send(
            "eth_getTransactionReceipt",
            [bufferToHex(FIRST_TX_HASH_OF_10496585)]
          );

          assert.equal(
            receipt.from,
            "0x4e87582f5e48f3e505b7d3b544972399ad9f2e5f"
          );
          assert.equal(
            receipt.to,
            "0xdac17f958d2ee523a2206206994597c13d831ec7"
          );
        });
      });

      describe("eth_getLogs", () => {
        it("can get remote logs", async function () {
          const logs = await this.provider.send("eth_getLogs", [
            {
              fromBlock: numberToRpcQuantity(BLOCK_NUMBER_OF_10496585),
              toBlock: numberToRpcQuantity(BLOCK_NUMBER_OF_10496585),
            },
          ]);

          assert.equal(logs.length, 205);
        });
      });

      describe("evm_revert", () => {
        it("can revert the state of WETH contract to a previous snapshot", async function () {
          const getWethBalance = async () =>
            this.provider.send("eth_getBalance", [bufferToHex(WETH_ADDRESS)]);

          const initialBalance = await getWethBalance();
          const snapshotId = await this.provider.send("evm_snapshot", []);
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: bufferToHex(WETH_ADDRESS),
              data: WETH_DEPOSIT_SELECTOR,
              value: numberToRpcQuantity(100),
              gas: numberToRpcQuantity(50000),
              gasPrice: numberToRpcQuantity(1),
            },
          ]);
          assert.notEqual(await getWethBalance(), initialBalance);

          const reverted = await this.provider.send("evm_revert", [snapshotId]);
          assert.isTrue(reverted);
          assert.equal(await getWethBalance(), initialBalance);
        });
      });

      describe("buidler_impersonate", () => {
        const oneEtherQuantity = numberToRpcQuantity(
          new BN(10).pow(new BN(18))
        );

        it("allows to impersonate a remote EOA", async function () {
          await this.provider.send("buidler_impersonate", [
            bufferToHex(BITFINEX_WALLET_ADDRESS),
          ]);

          await this.provider.send("eth_sendTransaction", [
            {
              from: bufferToHex(BITFINEX_WALLET_ADDRESS),
              to: bufferToHex(EMPTY_ACCOUNT_ADDRESS),
              value: oneEtherQuantity,
              gas: numberToRpcQuantity(21000),
              gasPrice: numberToRpcQuantity(1),
            },
          ]);
          const balance = await this.provider.send("eth_getBalance", [
            bufferToHex(EMPTY_ACCOUNT_ADDRESS),
          ]);
          assert.equal(balance, oneEtherQuantity);
        });

        it("allows to impersonate a remote contract account", async function () {
          // Get Uniswap DAI exchange address
          const getExchangeSelector = `0x06f2bf62${leftPad32(DAI_ADDRESS)}`;
          const result = await this.provider.send("eth_call", [
            {
              to: bufferToHex(UNISWAP_FACTORY_ADDRESS),
              data: getExchangeSelector,
            },
          ]);
          const daiExchangeAddress = hexStripZeros(result);

          // Impersonate the DAI exchange contract
          await this.provider.send("buidler_impersonate", [daiExchangeAddress]);

          // Transfer 10^18 DAI from the exchange contract to the EMPTY_ACCOUNT_ADDRESS
          const transferRawData = `0xa9059cbb${leftPad32(
            EMPTY_ACCOUNT_ADDRESS
          )}${leftPad32(oneEtherQuantity)}`;

          await this.provider.send("eth_sendTransaction", [
            {
              from: daiExchangeAddress,
              to: bufferToHex(DAI_ADDRESS),
              gas: numberToRpcQuantity(200_000),
              gasPrice: numberToRpcQuantity(1),
              data: transferRawData,
            },
          ]);

          // Check DAI balance of EMPTY_ACCOUNT_ADDRESS
          const balanceOfSelector = `0x70a08231${leftPad32(
            EMPTY_ACCOUNT_ADDRESS
          )}`;

          const daiBalance = await this.provider.send("eth_call", [
            { to: bufferToHex(DAI_ADDRESS), data: balanceOfSelector },
          ]);

          assert.equal(hexStripZeros(daiBalance), oneEtherQuantity);
        });
      });

      describe("buidler_stopImpersonating", () => {
        it("disables account impersonating", async function () {
          await this.provider.send("buidler_impersonate", [
            bufferToHex(BITFINEX_WALLET_ADDRESS),
          ]);
          await this.provider.send("buidler_stopImpersonating", [
            bufferToHex(BITFINEX_WALLET_ADDRESS),
          ]);

          await assertTransactionFailure(
            this.provider,
            {
              from: bufferToHex(BITFINEX_WALLET_ADDRESS),
              to: bufferToHex(EMPTY_ACCOUNT_ADDRESS),
              value: numberToRpcQuantity(100),
              gas: numberToRpcQuantity(21000),
              gasPrice: numberToRpcQuantity(1),
            },
            "unknown account",
            InvalidInputError.CODE
          );
        });
      });

      describe("buidler_reset", () => {
        it("can reset the forked provider to a given forkBlockNumber", async function () {
          const initialBlockNumber = quantityToNumber(
            await this.provider.send("eth_blockNumber")
          );
          await this.provider.send("buidler_reset", [
            { jsonRpcUrl, blockNumber: initialBlockNumber - 5 },
          ]);
          const newBlockNumber = quantityToNumber(
            await this.provider.send("eth_blockNumber")
          );
          assert.equal(newBlockNumber, initialBlockNumber - 5);
        });

        it("can reset the forked provider to the latest block number", async function () {
          const initialBlockNumber = quantityToNumber(
            await this.provider.send("eth_blockNumber")
          );
          await this.provider.send("buidler_reset", [
            { jsonRpcUrl, blockNumber: initialBlockNumber - 5 },
          ]);
          await this.provider.send("buidler_reset", [{ jsonRpcUrl }]);
          const newBlockNumber = quantityToNumber(
            await this.provider.send("eth_blockNumber")
          );
          assert.isAtLeast(newBlockNumber, initialBlockNumber);
        });
      });

      describe("Tests on remote contracts", () => {
        describe("Uniswap", () => {
          let wallet: Wallet;
          let factory: Contract;
          let daiExchange: Contract;
          let dai: Contract;

          beforeEach(async function () {
            const ethersProvider = new EthersProviderWrapper(this.provider);
            wallet = new Wallet(DEFAULT_ACCOUNTS[0].privateKey, ethersProvider);

            factory = new Contract(
              bufferToHex(UNISWAP_FACTORY_ADDRESS),
              UniswapFactoryAbi,
              ethersProvider
            );

            const daiExchangeAddress = await factory.getExchange(
              bufferToHex(DAI_ADDRESS)
            );

            daiExchange = new Contract(
              daiExchangeAddress,
              UniswapExchangeAbi,
              wallet
            );

            dai = new Contract(
              bufferToHex(DAI_ADDRESS),
              ERC20Abi,
              ethersProvider
            );
          });

          it("can buy DAI for Ether", async function () {
            const ethBefore = await wallet.getBalance();
            const daiBefore = await dai.balanceOf(wallet.address);
            assert.equal(daiBefore.toNumber(), 0);

            const expectedDai = await daiExchange.getEthToTokenInputPrice(
              utils.parseEther("0.5")
            );
            assert.isTrue(expectedDai.gt(0));

            await daiExchange.ethToTokenSwapInput(
              1, // min amount of token retrieved
              2525644800, // random timestamp in the future (year 2050)
              {
                gasLimit: 4000000,
                value: utils.parseEther("0.5"),
              }
            );

            const ethAfter = await wallet.getBalance();
            const daiAfter = await dai.balanceOf(wallet.address);

            const ethLost = parseFloat(
              utils.formatUnits(ethBefore.sub(ethAfter), "ether")
            );

            assert.equal(daiAfter.toString(), expectedDai.toString());
            assert.closeTo(ethLost, 0.5, 0.001);
          });
        });
      });
    });
  });
});
