task("example2", "example task", async (ret) => 28);

task("example", "example task", async (__, { run }) => run("example2"));

module.exports = {
  defaultNetwork: "custom",
  networks: {
    custom: {
      url: "http://127.0.0.1:8545",
    },
    localhost: {
      accounts: [
        "0xa95f9e3e7ae4e4865c5968828fe7c03fffa8a9f3bb52d36d26243f4c868ee166",
      ],
    },
  },
  solidity: "0.5.15",
  unknown: {
    asd: 123,
  },
};
