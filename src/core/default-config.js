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

        const provider = Ganache.provider(ganacheOptions);

        // Ganache's provider users web3-provider-engine, which doesn't support
        // sync requests.
        //
        // We could use a Ganache server and a normal HttpProvider, but those
        // are initialized asynchronously, and we create the environment
        // synchronously. This may be changed if we make most things lazily, but
        // not sure if that would work with tests written for truffle.
        const originalSend = provider.send;
        provider.send = (payload, callback) => {
          if (callback === undefined) {
            throw new Error(
              'Network "auto" does not support sync requests. Consider using pweb3 instead.'
            );
          }

          originalSend.call(provider, payload, callback);
        };

        return provider;
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
