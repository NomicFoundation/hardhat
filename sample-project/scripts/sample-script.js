const env = require("@nomiclabs/buidler");

async function main() {
  await env.run("compile");

  const accounts = await env.provider.send("eth_accounts");

  console.log("Accounts:", accounts);
}

main().catch(console.error);
