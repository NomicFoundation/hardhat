// We require the Buidler Runtime Environment explicitly here. This is optional.
const env = require("@nomiclabs/buidler");

async function main() {
  const accounts = await env.network.provider.send("eth_accounts");
  // console.log(">> Accounts detected! ", accounts.length);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
