const BigNumber = require("bignumber.js");
const Ganache = require("ganache-core");

module.exports = {
  solc: {
    optimizer: {
      enabled: false,
      runs: 200
    }
  },
  networks: {
    develop: {
      host: "127.0.0.1",
      port: 8545
    },
    auto: {
      provider() {
        const ganacheOptions = {
          gasLimit: this.blockGasLimit,
          network_id: 4447
        };

        if (this.accounts === undefined || this.accounts.length === 0) {
          ganacheOptions.mnemonic =
            "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
        } else {
          ganacheOptions.accounts = this.accounts.map(acc => ({
            balance: "0x" + new BigNumber(acc.balance).toString(16),
            secretKey: acc.privateKey
          }));
        }

        return Ganache.provider(ganacheOptions);
      },
      blockGasLimit: 7500000,
      accounts: [
        // {
        //   privateKey:
        //     "0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501200",
        //   balance: 1000000000000000000000000
        // }
      ]
    }
  }
};
