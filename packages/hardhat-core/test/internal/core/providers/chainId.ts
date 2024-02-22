import { assert } from "chai";

import { ERRORS } from "../../../../src/internal/core/errors-list";
import { numberToRpcQuantity } from "../../../../src/internal/core/jsonrpc/types/base-types";
import {
  ChainIdValidatorProvider,
  ProviderWrapperWithChainId,
} from "../../../../src/internal/core/providers/chainId";
import { RequestArguments } from "../../../../src/types";
import { expectHardhatErrorAsync } from "../../../helpers/errors";

import { MockedProvider } from "./mocks";

describe("ChainIdValidatorProvider", () => {
  it("should fail when configured chain id dont match the real chain id", async () => {
    const mock = new MockedProvider();
    mock.setReturnValue("eth_chainId", "0xabcabc");

    const wrapper = new ChainIdValidatorProvider(mock, 66666);
    await expectHardhatErrorAsync(
      () => wrapper.request({ method: "eth_getAccounts", params: [] }),
      ERRORS.NETWORK.INVALID_GLOBAL_CHAIN_ID
    );
  });
});

class TestProvider extends ProviderWrapperWithChainId {
  public async request(args: RequestArguments): Promise<unknown> {
    return this._wrappedProvider.request(args);
  }

  public async getChainId() {
    return this._getChainId();
  }
}

describe("ProviderWrapperWithChainId", function () {
  it("Should call the provider only once", async function () {
    const mockedProvider = new MockedProvider();
    mockedProvider.setReturnValue("eth_chainId", numberToRpcQuantity(1));
    mockedProvider.setReturnValue("net_version", "2");

    const testProvider = new TestProvider(mockedProvider);

    assert.strictEqual(mockedProvider.getTotalNumberOfCalls(), 0);
    await testProvider.getChainId();
    assert.strictEqual(mockedProvider.getTotalNumberOfCalls(), 1);
    await testProvider.getChainId();
    assert.strictEqual(mockedProvider.getTotalNumberOfCalls(), 1);
    await testProvider.getChainId();
    assert.strictEqual(mockedProvider.getTotalNumberOfCalls(), 1);

    const mockedProvider2 = new MockedProvider();
    mockedProvider2.setReturnValue("net_version", "2");
    const testProvider2 = new TestProvider(mockedProvider2);

    assert.strictEqual(mockedProvider2.getTotalNumberOfCalls(), 0);
    await testProvider2.getChainId();

    // First eth_chainId is called, then net_version, hence 2
    assert.strictEqual(mockedProvider2.getTotalNumberOfCalls(), 2);
    await testProvider2.getChainId();
    assert.strictEqual(mockedProvider2.getTotalNumberOfCalls(), 2);
    await testProvider2.getChainId();
    assert.strictEqual(mockedProvider2.getTotalNumberOfCalls(), 2);
  });

  it("Should use eth_chainId if supported", async function () {
    const mockedProvider = new MockedProvider();
    mockedProvider.setReturnValue("eth_chainId", numberToRpcQuantity(1));
    mockedProvider.setReturnValue("net_version", "2");

    const testProvider = new TestProvider(mockedProvider);

    assert.strictEqual(await testProvider.getChainId(), 1);
  });

  it("Should use net_version if eth_chainId is not supported", async function () {
    const mockedProvider = new MockedProvider();
    mockedProvider.setReturnValue("net_version", "2");
    const testProvider = new TestProvider(mockedProvider);

    assert.strictEqual(await testProvider.getChainId(), 2);
  });

  it("Should throw if both eth_chainId and net_version fail", async function () {
    const mockedProvider = new MockedProvider();
    mockedProvider.setReturnValue("eth_chainId", () => {
      throw new Error("Unsupported method");
    });
    mockedProvider.setReturnValue("net_version", () => {
      throw new Error("Unsupported method");
    });

    const testProvider = new TestProvider(mockedProvider);

    try {
      await testProvider.getChainId();
    } catch {
      return;
    }

    assert.fail("Expected exception not thrown");
  });
});
