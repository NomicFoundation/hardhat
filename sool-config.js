task("asd", "Sample user-defined task")
  .addParam("sampleOptionalParam", "Just a float", 1.2, types.float)
  .addParam("sampleRequiredParam", "Just a number", undefined, types.int)
  .setAction(async () => {
    console.log(
      "This is a sample user-defined task, which can run other tasks"
    );
    await run("compile");
  });

module.exports = {
  solc: {
    version: "0.4.20"
  },
  networks: {
    network2: {
      host: "127.0.0.1",
      port: 8546,
      network_id: "*" // Match any network id
    }
  }
};
