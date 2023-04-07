import sinon from "sinon";
import { assert, expect } from "chai";
import { setGlobalDispatcher } from "undici";
import { TASK_VERIFY } from "../../src/task-names";
import { getRandomAddress, useEnvironment } from "../helpers";
import EtherscanMockAgent from "./mocks/etherscan";

import "../../src/type-extensions";

describe("verify task", function () {
  // this.timeout(1000000);
  useEnvironment("hardhat-project");
  setGlobalDispatcher(EtherscanMockAgent);

  it("should return after printing the supported networks", async function () {
    const logStub = sinon.stub(console, "log");
    const taskResponse = await this.hre.run(TASK_VERIFY, {
      address: getRandomAddress(this.hre),
      constructorArgsParams: [],
      listNetworks: true,
    });

    expect(logStub).to.be.calledOnceWith(
      sinon.match(/Networks supported by hardhat-etherscan/)
    );
    logStub.restore();
    assert.isUndefined(taskResponse);
  });

  it("should return if the contract is already verified", async function () {
    const logStub = sinon.stub(console, "log");
    const address = getRandomAddress(this.hre);

    const taskResponse = await this.hre.run(TASK_VERIFY, {
      address,
      constructorArgsParams: [],
    });

    expect(logStub).to.be.calledOnceWith(
      `The contract ${address} has already been verified`
    );
    logStub.restore();
    assert.isUndefined(taskResponse);
  });
});
