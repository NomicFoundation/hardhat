import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { withConnection } from "../../../../../src/internal/builtin-plugins/hhu/tasks/connection.js";
import { ProviderError } from "../../../../../src/internal/builtin-plugins/network-manager/provider-errors.js";
import { createHardhatRuntimeEnvironment } from "../../../../../src/internal/hre-initialization.js";

describe("withConnection", () => {
  it("throws network errors as HardhatErrors, with a remote node's revert data", async () => {
    const hre = await createHardhatRuntimeEnvironment({});

    // Like the error the HTTP provider throws for a remote node's revert
    const error = new ProviderError("execution reverted", 3);
    error.data = "0xdeadbeef";

    await assertRejectsWithHardhatError(
      withConnection(hre, async () => {
        throw error;
      }),
      HardhatError.ERRORS.CORE.NETWORK.JSON_RPC_REQUEST_FAILED,
      { code: 3, message: 'execution reverted, data: "0xdeadbeef"' },
    );
  });
});
