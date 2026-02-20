import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { network } from "hardhat";

/**
 * `connectOnBefore` intentionally does not require an await; indeed it is
 * intended to be run within a describe block, which in Mocha cannot be async.
 * Hence we should throw a HardhatError if the user attempts to use an
 * await on the returned proxy.
 */
describe("connectOnBefore with await", function () {
  it("should throw if awaited", async function () {
    await assertRejectsWithHardhatError(
      async () => {
        await network.mocha.connectOnBefore();
      },
      HardhatError.ERRORS.HARDHAT_MOCHA.CONNECT_ON_BEFORE
        .AWAIT_CONNECT_ON_BEFORE,
      {},
    );
  });
});
