import { ERRORS } from "../../../../src/internal/core/errors-list";
import { createChainIdValidationProvider } from "../../../../src/internal/core/providers/chainId";
import { expectBuidlerErrorAsync } from "../../../helpers/errors";

import { MockedProvider } from "./mocks";

describe("Chain id provider", () => {
  it("should fail when configured chain id dont match the real chain id", async () => {
    const mock = new MockedProvider();
    mock.setReturnValue("eth_chainId", "0xabcabc");

    const wrapper = createChainIdValidationProvider(mock, 66666);
    await expectBuidlerErrorAsync(
      () => wrapper.send("eth_getAccounts", []),
      ERRORS.NETWORK.INVALID_GLOBAL_CHAIN_ID
    );
  });
});
