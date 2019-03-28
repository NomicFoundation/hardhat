task("accounts", "Prints a list of the available accounts", async () => {
  const accounts = await ethereum.send("eth_accounts");

  console.log("Accounts:", accounts);
});

module.exports = {};
