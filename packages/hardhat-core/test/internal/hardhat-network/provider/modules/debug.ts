import { assert } from "chai";

import { RpcDebugTraceOutput } from "../../../../../src/internal/hardhat-network/provider/output";
import { trace as modifiesStateTrace } from "../../../../fixture-debug-traces/modifiesStateTrace";
import { assertInvalidInputError } from "../../helpers/assertions";
import { EXAMPLE_CONTRACT } from "../../helpers/contracts";
import { setCWD } from "../../helpers/cwd";
import { DEFAULT_ACCOUNTS_ADDRESSES, PROVIDERS } from "../../helpers/providers";
import { sendDummyTransaction } from "../../helpers/sendDummyTransaction";
import { deployContract } from "../../helpers/transactions";

describe("Debug module", function () {
  PROVIDERS.forEach(({ name, useProvider }) => {
    describe(`${name} provider`, function () {
      setCWD();
      useProvider();

      describe("debug_traceTransaction", async function () {
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
});
