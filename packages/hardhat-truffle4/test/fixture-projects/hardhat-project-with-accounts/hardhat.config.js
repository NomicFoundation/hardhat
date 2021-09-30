require("../../../src/index");

module.exports = {
  solidity: "0.5.15",
  networks: {
    hardhat: {
      accounts: [
        {
          privateKey:
            "0xe1904817e407877ea09135933f39121aa68ed0d9729d301084c544204171d100",
          balance: "10000",
        },
        {
          privateKey:
            "0xe1904817e407877ea09135933f39121aa68ed0d9729d301084c544204171d101",
          balance: "10000",
        },
      ],
    },
  },
};
