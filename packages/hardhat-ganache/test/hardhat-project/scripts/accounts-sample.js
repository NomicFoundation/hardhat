// We require the Hardhat Runtime Environment explicitly here. This is optional.
const env = require("hardhat");

async function main() {
  const accounts = await env.network.provider.send("eth_accounts");

  // Test for existence
  if (!accounts) {
    throw new Error("Accounts not detected");
  }

  // Test for validity of all data
  if (accounts.length !== 10) {
    throw new Error("Invalid Accounts amount");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
