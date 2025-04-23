import type { HardhatViemMatchers } from "../../../../src/types.js";
import type { HardhatViemHelpers } from "@nomicfoundation/hardhat-viem/types";

import { beforeEach, describe, it } from "node:test";

import { assertThrows } from "@nomicfoundation/hardhat-test-utils";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import hardhatViemMatchers from "../../../../src/index.js";

describe("properAddress", () => {
  let viem: HardhatViemHelpers & {
    assertions: HardhatViemMatchers;
  };

  beforeEach(async () => {
    const hre = await createHardhatRuntimeEnvironment({
      plugins: [hardhatViem, hardhatViemMatchers],
    });

    ({ viem } = await hre.network.connect());
  });

  it("should not throw because the address is valid", async () => {
    viem.assertions.utils.properAddress(
      "0x52908400098527886E0F7030069857D2E4169EE7",
    );
  });

  it("should throw because the address is invalid: too short", async () => {
    assertThrows(
      () => viem.assertions.utils.properAddress("0x1"),
      (error) => error.message.includes(`Address "0x1" is not valid`),
    );
  });
});
