require("../../../src/index");

module.exports = {
  networks: {
    hardhat: {
      accounts: [
        {
          privateKey:
            "0x07711bb9fb8508a36bf0307c579a8974d1a3230badb8757b6e22d203190ea800",
          balance: "123",
        },
        {
          privateKey:
            "0x07711bb9fb8508a36bf0307c579a8974d1a3230badb8757b6e22d203190ea803",
          balance: "123",
        },
      ],
    },
  },
  solidity: "0.5.15",
};
