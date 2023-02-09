/* eslint-disable import/no-unused-modules */
import { ContractsService } from "@ignored/ignition-core/dist/services/ContractsService";
import { TransactionsService } from "@ignored/ignition-core/dist/services/TransactionsService";
import { assert } from "chai";
import { BigNumber } from "ethers";
import sinon from "sinon";

import { deployModule } from "./helpers";
import { useEnvironment } from "./useEnvironment";

describe("config", () => {
  useEnvironment("with-config");
  let sendTxStub: sinon.SinonStub;

  before(async function () {
    sinon.stub(TransactionsService.prototype, "wait").resolves({
      blockHash: "",
      blockNumber: 0,
      confirmations: 0,
      from: "",
      byzantium: true,
      contractAddress: "",
      cumulativeGasUsed: BigNumber.from(0),
      effectiveGasPrice: BigNumber.from(0),
      gasUsed: BigNumber.from(0),
      logs: [],
      logsBloom: "",
      to: "",
      transactionHash: "",
      transactionIndex: 0,
      type: 0,
    });

    sendTxStub = sinon
      .stub(ContractsService.prototype, "sendTx")
      .resolves(
        "0xb75381e904154b34814d387c29e1927449edd98d30f5e310f25e9b1f19b0b077"
      );
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should apply maxRetries", async function () {
    await deployModule(this.hre, (m) => {
      m.contract("Bar");

      return {};
    });

    const sendTxOptions = sendTxStub.getCalls()[0].lastArg;

    assert.equal(sendTxOptions.maxRetries, 1);
  });

  it("should apply gasPriceIncrementPerRetry", async function () {
    await deployModule(this.hre, (m) => {
      m.contract("Bar");

      return {};
    });

    const sendTxOptions = sendTxStub.getCalls()[0].lastArg;

    assert(BigNumber.isBigNumber(sendTxOptions.gasPriceIncrementPerRetry));
    assert(BigNumber.from(sendTxOptions.gasPriceIncrementPerRetry).eq(1000));
  });

  it("should apply pollingInterval", async function () {
    await deployModule(this.hre, (m) => {
      m.contract("Bar");

      return {};
    });

    const sendTxOptions = sendTxStub.getCalls()[0].lastArg;

    assert.equal(sendTxOptions.pollingInterval, 4);
  });

  it("should apply eventDuration", async function () {
    await deployModule(this.hre, (m) => {
      m.contract("Bar");

      return {};
    });

    const sendTxOptions = sendTxStub.getCalls()[0].lastArg;

    assert.equal(sendTxOptions.eventDuration, 10000);
  });
});
