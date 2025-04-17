import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { writeJsonFile } from "@nomicfoundation/hardhat-utils/fs";
import { before, after } from "node:test";

before(async () => {
  // TODO: implement
});

after(async () => {
  assertHardhatInvariant(
    process.env.HARDHAT_NODE_TEST_COVERAGE_PATH !== undefined,
    "HARDHAT_NODE_TEST_COVERAGE_PATH should be defined",
  );
  await writeJsonFile(process.env.HARDHAT_NODE_TEST_COVERAGE_PATH, {});
});
