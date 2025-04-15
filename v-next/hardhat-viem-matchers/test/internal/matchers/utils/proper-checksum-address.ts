import { describe, it } from "node:test";

import {
  assertRejects,
  assertThrows,
} from "@nomicfoundation/hardhat-test-utils";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import hardhatViemMatchers from "../../../../src/index.js";

describe("properChecksumAddress", () => {
  it("should not throw because the address is valid", async () => {
    const hre = await createHardhatRuntimeEnvironment({
      plugins: [hardhatViem, hardhatViemMatchers],
    });

    const { viem } = await hre.network.connect();

    await viem.assertions.utils.properChecksumAddress(
      "0x52908400098527886E0F7030069857D2E4169EE7",
    );
  });

  it("should throw because the address is invalid: too short", async () => {
    const hre = await createHardhatRuntimeEnvironment({
      plugins: [hardhatViem, hardhatViemMatchers],
    });

    const { viem } = await hre.network.connect();

    await assertRejects(
      () => viem.assertions.utils.properChecksumAddress("0x1"),
      (error) => error.message === `Address "0x1" is not valid`,
    );
  });

  it("should throw because the address is invalid: wrong checksum", async () => {
    const hre = await createHardhatRuntimeEnvironment({
      plugins: [hardhatViem, hardhatViemMatchers],
    });

    const { viem } = await hre.network.connect();

    await assertRejects(
      () =>
        viem.assertions.utils.properChecksumAddress(
          "0x2f015c60e0be116b1f0cd534704db9c92118fb6a",
        ),
      (error) =>
        error.message ===
        `The address "0x2f015c60e0be116b1f0cd534704db9c92118fb6a" has the correct format, but its checksum is incorrect`,
    );
  });
});
