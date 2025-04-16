import type { HardhatViemMatchers } from "../../../../../src/types.js";
import type { HardhatViemHelpers } from "@nomicfoundation/hardhat-viem/types";

import { beforeEach, describe, it } from "node:test";

import { assertThrows } from "@nomicfoundation/hardhat-test-utils";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import hardhatViemMatchers from "../../../../../src/index.js";

describe("areApproximatelyEqual", () => {
  let viem: HardhatViemHelpers & {
    assertions: HardhatViemMatchers;
  };

  beforeEach(async () => {
    const hre = await createHardhatRuntimeEnvironment({
      plugins: [hardhatViem, hardhatViemMatchers],
    });

    ({ viem } = await hre.network.connect());
  });

  it("should not throw because the values are approximately equal, with the first number being bigger", async () => {
    viem.assertions.utils.areApproximatelyEqual(100n, 99n, 2n);
  });

  it("should not throw because the values are approximately equal, with the second number being bigger", async () => {
    viem.assertions.utils.areApproximatelyEqual(99n, 100n, 2n);
  });

  it("should not throw because the values are equal", async () => {
    viem.assertions.utils.areApproximatelyEqual(100n, 100n, 0n);
  });

  it("should throw because the values are not approximately equal", async () => {
    assertThrows(
      () => viem.assertions.utils.areApproximatelyEqual(100n, 95n, 2n),
      (error) =>
        error.message ===
        `Expected 100 to be approximately equal to 95 within a variance of 2, but found a difference of 5.`,
    );
  });
});
