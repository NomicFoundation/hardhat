import { execSync } from "node:child_process";

// Array of test file paths
const testFiles = [
  "./test/network-helpers/drop-transaction.ts",
  "./test/network-helpers/get-storage-at.ts",
  "./test/network-helpers/impersonate-account.ts",
  "./test/network-helpers/mine.ts",
  "./test/network-helpers/mine-up-to.ts",
  "./test/network-helpers/reset.ts",
  "./test/network-helpers/set-balance.ts",
  "./test/network-helpers/set-block-gas-limit.ts",
  "./test/network-helpers/set-code.ts",
  "./test/network-helpers/set-coinbase.ts",
  "./test/network-helpers/set-next-block-base-fee-per-gas.ts",
  "./test/network-helpers/set-nonce.ts",
  "./test/network-helpers/set-prevrandao.ts",
  "./test/network-helpers/set-storage-at.ts",
  "./test/network-helpers/stop-impersonating-account.ts",
  "./test/network-helpers/take-snapshot.ts",
  "./test/time/increase.ts",
  "./test/time/increase-to.ts",
  "./test/time/latest.ts",
  "./test/time/latest-block.ts",
  "./test/time/set-next-block-timestamp.ts",
  "./test/index.ts",
];

// Function to run the tests synchronously
function runTests() {
  for (const testFile of testFiles) {
    try {
      console.log(`Running test: ${testFile}`);
      execSync(
        `node --import tsx/esm --test --test-reporter=@ignored/hardhat-vnext-node-test-reporter ${testFile}`,
        { stdio: "inherit" },
      );
    } catch (error) {
      console.error(`Test failed: ${testFile}`);
      process.exit(1);
    }
  }
  console.log("All tests completed successfully.");
}

runTests();
