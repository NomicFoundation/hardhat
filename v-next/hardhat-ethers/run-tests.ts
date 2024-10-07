import { execSync } from "node:child_process";

// Array of test file paths
const testFiles = [
  "./test-tmp/contracts.ts",
  "./test-tmp/error-messages.ts",
  "./test-tmp/gas-config.ts",
  "./test-tmp/gas-price.ts",
  "./test-tmp/hardhat-ethers-provider.ts",
  "./test-tmp/hardhat-ethers-signer.ts",
  "./test-tmp/index.ts",
  "./test-tmp/no-accounts.ts",
  "./test-tmp/plugin-functionalities.ts",
  "./test-tmp/provider-events.ts",
  "./test-tmp/transactions.ts",
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
