it("provider should be available", async function () {
  await hre.network.provider.send("eth_accounts");
});
