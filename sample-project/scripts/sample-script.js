const env = require("@nomiclabs/buidler");

async function main() {
  await env.run("compile");

  const accounts = await env.provider.send("eth_accounts");

  console.log("Accounts:", accounts);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
