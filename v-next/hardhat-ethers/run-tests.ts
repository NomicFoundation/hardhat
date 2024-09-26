import { execSync } from "node:child_process";

// Array of test file paths
const testFiles = [
  "./test/contracts.ts",
  "./test/error-messages.ts",
  "./test/gas-config.ts",
  "./test/gas-price.ts",
  "./test/hardhat-ethers-provider.ts",
  "./test/hardhat-ethers-signer.ts",
  "./test/index.ts",
  "./test/no-accounts.ts",
  "./test/plugin-functionalities.ts",
  "./test/provider-events.ts",
  "./test/transactions.ts",
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
