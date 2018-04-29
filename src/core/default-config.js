const Ganache = require("ganache-core");
const BigNumber = require("bignumber.js");

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
        const accounts = this.accounts.map(acc => ({
          balance: "0x" + new BigNumber(acc.balance).toString(16),
          secretKey: acc.privateKey
        }));

        return Ganache.provider({ accounts });
      },
      accounts: [
        {
          privateKey:
            "0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501200",
          balance: 1000000000000000000000000
        },
        {
          privateKey:
            "0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501201",
          balance: 1000000000000000000000000
        },
        {
          privateKey:
            "0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501202",
          balance: 1000000000000000000000000
        },
        {
          privateKey:
            "0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501203",
          balance: 1000000000000000000000000
        },
        {
          privateKey:
            "0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501204",
          balance: 1000000000000000000000000
        },
        {
          privateKey:
            "0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501205",
          balance: 1000000000000000000000000
        },
        {
          privateKey:
            "0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501206",
          balance: 1000000000000000000000000
        },
        {
          privateKey:
            "0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501207",
          balance: 1000000000000000000000000
        },
        {
          privateKey:
            "0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501208",
          balance: 1000000000000000000000000
        },
        {
          privateKey:
            "0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501209",
          balance: 1000000000000000000000000
        }
      ]
    }
  }
};
