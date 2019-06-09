import { ERRORS } from "../../../../src/internal/core/errors";
import { createChainIdValidationProvider } from "../../../../src/internal/core/providers/chainId";
import { expectBuidlerErrorAsync } from "../../../helpers/errors";

import { CountProvider } from "./mocks";

describe("Chain id provider", () => {
  it("should fail when configured chain id dont match the real chain id", async () => {
    const validChainId = 123;
    const mock = new CountProvider();
    const wrapper = createChainIdValidationProvider(mock, validChainId + 1);
    await expectBuidlerErrorAsync(
      () => wrapper.send("eth_getAccounts", []),
      ERRORS.NETWORK.INVALID_GLOBAL_CHAIN_ID
    );
  });
});
