import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { network } from "hardhat";

/**
 * `connectToSingleton` intentionally does not require an await; indeed it is
 * intended to be run at the files top level.
 *
 * Hence we should throw a HardhatError if the user attempts to use an
 * await on the returned proxy.
 */
describe("connectToSingleton with await", function () {
  it("should throw if awaited", async function () {
    await assertRejectsWithHardhatError(
      async () => {
        await network.mocha.connectToSingleton();
      },
      HardhatError.ERRORS.HARDHAT_MOCHA.CONNECTION_PROXY.AWAIT_CONNECTION_PROXY,
      {},
    );
  });
});
