import { assert } from "chai";

import { BackwardsCompatibilityProviderAdapter } from "../../../../../src/internal/core/providers/backwards-compatibility";
import { ForkConfig } from "../../../../../src/internal/hardhat-network/provider/node-types";
import { RpcDebugTraceOutput } from "../../../../../src/internal/hardhat-network/provider/output";
import { HardhatNetworkProvider } from "../../../../../src/internal/hardhat-network/provider/provider";
import { EthereumProvider } from "../../../../../src/types";
import { trace as mainnetReturnsDataTrace } from "../../../../fixture-debug-traces/mainnetReturnsDataTrace";
import { trace as mainnetReturnsDataTraceGeth } from "../../../../fixture-debug-traces/mainnetReturnsDataTraceGeth";
import { trace as mainnetRevertTrace } from "../../../../fixture-debug-traces/mainnetRevertTrace";
import { trace as modifiesStateTrace } from "../../../../fixture-debug-traces/modifiesStateTrace";
import { ALCHEMY_URL } from "../../../../setup";
import { assertInvalidInputError } from "../../helpers/assertions";
import { FORK_TESTS_CACHE_PATH } from "../../helpers/constants";
import { EXAMPLE_CONTRACT } from "../../helpers/contracts";
import { setCWD } from "../../helpers/cwd";
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_ACCOUNTS_ADDRESSES,
  DEFAULT_ALLOW_UNLIMITED_CONTRACT_SIZE,
  DEFAULT_CHAIN_ID,
  DEFAULT_HARDFORK,
  DEFAULT_NETWORK_ID,
  DEFAULT_NETWORK_NAME,
  PROVIDERS,
} from "../../helpers/providers";
import { sendDummyTransaction } from "../../helpers/sendDummyTransaction";
import { deployContract } from "../../helpers/transactions";
import { assertEqualTraces } from "../utils/assertEqualTraces";

describe("Debug module", function () {
  PROVIDERS.forEach(({ name, useProvider }) => {
    describe(`${name} provider`, function () {
      setCWD();
      useProvider();

      describe("debug_traceTransaction", function () {
        it("Should throw for unknown txs", async function () {
          const unknownTxHash =
            "0x1234567876543234567876543456765434567aeaeaed67616732632762762373";
          await assertInvalidInputError(
            this.provider,
            "debug_traceTransaction",
            [unknownTxHash],
            `Unable to find a block containing transaction ${unknownTxHash}`
          );
        });
        it("Should return the right values for successful value transfer txs", async function () {
          const txHash = await sendDummyTransaction(this.provider, 0);

          const trace: RpcDebugTraceOutput = await this.provider.send(
            "debug_traceTransaction",
            [txHash]
          );
          assert.deepEqual(trace, {
            gas: 21000,
            failed: false,
            returnValue: "",
            structLogs: [],
          });
        });
        it("Should return the right values for successful contract tx", async function () {
          const contractAddress = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );
          const txHash = await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: contractAddress,
              data: `${EXAMPLE_CONTRACT.selectors.modifiesState}000000000000000000000000000000000000000000000000000000000000000a`,
            },
          ]);

          const trace: RpcDebugTraceOutput = await this.provider.send(
            "debug_traceTransaction",
            [txHash]
          );
          assert.deepEqual(trace, modifiesStateTrace);
        });
      });
    });
  });

  describe("fork tests", function () {
    this.timeout(120000);

    let provider: EthereumProvider;

    beforeEach(function () {
      if (ALCHEMY_URL === undefined) {
        this.skip();
      }
      const forkConfig: ForkConfig = {
        jsonRpcUrl: ALCHEMY_URL!,
        blockNumber: 11954000,
      };

      const logger = new ModulesLogger(true);

      const hardhatNetworkProvider = new HardhatNetworkProvider(
        DEFAULT_HARDFORK,
        DEFAULT_NETWORK_NAME,
        DEFAULT_CHAIN_ID,
        DEFAULT_NETWORK_ID,
        13000000,
        true,
        true,
        false, // mining.auto
        0, // mining.interval
        logger,
        DEFAULT_ACCOUNTS,
        undefined,
        DEFAULT_ALLOW_UNLIMITED_CONTRACT_SIZE,
        undefined,
        undefined,
        forkConfig,
        FORK_TESTS_CACHE_PATH
      );

      provider = new BackwardsCompatibilityProviderAdapter(
        hardhatNetworkProvider
      );
    });

    it("Should return the right values for a successful tx", async function () {
      const trace: RpcDebugTraceOutput = await provider.send(
        "debug_traceTransaction",
        ["0x89ebeb319fcd7bda9c7f8c1b78a7571842a705425b175f24f34fe8e6c60580d4"]
      );

      assertEqualTraces(trace, mainnetReturnsDataTrace);
      assertEqualTraces(trace, mainnetReturnsDataTraceGeth);
    });

    it("Should return the right values for a reverted tx", async function () {
      const trace: RpcDebugTraceOutput = await provider.send(
        "debug_traceTransaction",
        ["0x6214b912cc9916d8b7bf5f4ff876e259f5f3754ddebb6df8c8e897cad31ae148"]
      );

      assertEqualTraces(trace, mainnetRevertTrace);
    });
  });
});
