import { describe, it } from "node:test";

import { assertThrows } from "@nomicfoundation/hardhat-test-utils";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import hardhatViemMatchers from "../../../../src/index.js";

describe("properAddress", () => {
  it("should not throw because the address is valid", async () => {
    const hre = await createHardhatRuntimeEnvironment({
      plugins: [hardhatViem, hardhatViemMatchers],
    });

    const { viem } = await hre.network.connect();

    viem.assertions.utils.properAddress(
      "0x52908400098527886E0F7030069857D2E4169EE7",
    );
  });

  it("should throw because the address is invalid: too short", async () => {
    const hre = await createHardhatRuntimeEnvironment({
      plugins: [hardhatViem, hardhatViemMatchers],
    });

    const { viem } = await hre.network.connect();

    assertThrows(
      () => viem.assertions.utils.properAddress("0x1"),
      (error) => error.message === `Address "0x1" is not valid`,
    );
  });
});
