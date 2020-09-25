const env = require("hardhat");

async function main() {
  const accounts = await env.network.provider.send("eth_accounts");
  await delay(0.2);
  const accountsAux = await env.network.provider.send("eth_accounts");

  // Test for existence
  if (!accounts || !accountsAux) {
    throw new Error("Accounts not detected");
  }

  // Test for validity of all data
  if (accounts.length !== 10 || accountsAux.length !== 10) {
    throw new Error("Invalid Accounts amount");
  }
}

const delay = (seg) => new Promise((res) => setTimeout(res, seg * 1000));

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
