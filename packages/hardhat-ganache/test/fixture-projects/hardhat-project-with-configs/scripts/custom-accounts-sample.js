// We require the Hardhat Runtime Environment explicitly here. This is optional.
const env = require("hardhat");

async function main() {
  const customConfigs = require("../hardhat.config.ts").default;
  const customOptions = customConfigs.networks.ganache;

  const accounts = await env.network.provider.send("eth_accounts");

  // Test for existence
  if (!accounts) {
    throw new Error("Accounts not detected");
  }

  // Test for validity of all data

  // Test for: totalAccounts
  if (accounts.length !== customOptions.totalAccounts) {
    throw new Error("Invalid: total accounts");
  }

  // Test for: defaultBalanceEther
  for (let account of accounts) {
    let accParams = [account, "latest"];
    const balance = await env.network.provider.send(
      "eth_getBalance",
      accParams
    );
    const defaultBalanceWei = customOptions.defaultBalanceEther * 10 ** 18;
    const accBalanceWei = parseInt(balance, 16);

    if (accBalanceWei !== defaultBalanceWei) {
      throw new Error("Invalid: default balance");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
