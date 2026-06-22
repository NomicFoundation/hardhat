import type { HardhatViemHelpers } from "@nomicfoundation/hardhat-viem/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";

import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";

import { useEphemeralFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import hardhatViemAssertions from "../../src/index.js";

describe("LazyHardhatViemAssertions", () => {
  let hre: HardhatRuntimeEnvironment;
  let viem: HardhatViemHelpers;

  useEphemeralFixtureProject("hardhat-project");

  before(async () => {
    hre = await createHardhatRuntimeEnvironment({
      solidity: "0.8.24",
      plugins: [hardhatViem, hardhatViemAssertions],
    });
  });

  beforeEach(async () => {
    ({ viem } = await hre.network.create());
  });

  it("does not emit an unhandledRejection when an assertion receives a promise that rejects before the lazy implementation is loaded", async () => {
    const unhandled: unknown[] = [];
    const onUnhandledRejection = (reason: unknown) => {
      unhandled.push(reason);
    };
    process.on("unhandledRejection", onUnhandledRejection);

    try {
      // A promise that rejects immediately, i.e. before the dynamic import of
      // the assertion implementation resolves. Without
      // `settleBeforeLazyImport`, this rejection would be reported as unhandled
      // while the import is still in flight, even though it ends up being
      // handled once the implementation loads.
      const rejecting = Promise.reject(new Error("rejected before import"));

      await viem.assertions.revert(rejecting).catch(() => {
        // The assertion outcome is irrelevant here; we only care that the
        // rejection above is never surfaced as an unhandledRejection.
      });

      // Give Node a chance to deliver any pending unhandledRejection event.
      await new Promise((resolve) => setImmediate(resolve));

      assert.deepEqual(
        unhandled,
        [],
        "the input promise rejection should be handled, not surfaced as an unhandledRejection",
      );
    } finally {
      process.off("unhandledRejection", onUnhandledRejection);
    }
  });
});
