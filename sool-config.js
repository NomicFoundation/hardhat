task("asd", "Sample user-defined task", async () => {
  console.log("This is a sample user-defined task");
});

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*" // Match any network id
    },
    network2: {
      host: "127.0.0.1",
      port: 8546,
      network_id: "*" // Match any network id
    }
  }
};
