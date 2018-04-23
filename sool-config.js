task("asd", "Sample user-defined task", async () => {
  console.log("This is a sample user-defined task");
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
