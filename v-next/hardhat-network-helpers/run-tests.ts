import { execSync } from "node:child_process";

// Array of test file paths
const testFiles = [
  "./test-tmp/network-helpers/drop-transaction.ts",
  "./test-tmp/network-helpers/get-storage-at.ts",
  "./test-tmp/network-helpers/impersonate-account.ts",
  "./test-tmp/network-helpers/mine.ts",
  "./test-tmp/network-helpers/mine-up-to.ts",
  "./test-tmp/network-helpers/reset.ts",
  "./test-tmp/network-helpers/set-balance.ts",
  "./test-tmp/network-helpers/set-block-gas-limit.ts",
  "./test-tmp/network-helpers/set-code.ts",
  "./test-tmp/network-helpers/set-coinbase.ts",
  "./test-tmp/network-helpers/set-next-block-base-fee-per-gas.ts",
  "./test-tmp/network-helpers/set-nonce.ts",
  "./test-tmp/network-helpers/set-prevrandao.ts",
  "./test-tmp/network-helpers/set-storage-at.ts",
  "./test-tmp/network-helpers/stop-impersonating-account.ts",
  "./test-tmp/network-helpers/take-snapshot.ts",
  "./test-tmp/time/increase.ts",
  "./test-tmp/time/increase-to.ts",
  "./test-tmp/time/latest.ts",
  "./test-tmp/time/latest-block.ts",
  "./test-tmp/time/set-next-block-timestamp.ts",
  "./test-tmp/index.ts",
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
