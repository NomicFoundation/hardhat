task("accounts", "Prints a list of the available accounts", async taskArgs => {
     const accounts = await env.provider.send("eth_accounts");

     console.log("Accounts:", accounts);
  });

module.exports = {};
