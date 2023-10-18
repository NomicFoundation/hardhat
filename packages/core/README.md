# Hardhat Ignition Core

The core logic of Hardhat Ignition, including the execution engine and Module api.

Built by the [Nomic Foundation](https://nomic.foundation/) for the Ethereum community.

Join the Hardhat Ignition channel of our [Hardhat Support Discord server](https://hardhat.org/ignition-discord) to stay up to date on new releases and tutorials.

## Installation

```bash
npm install --save-dev @nomicfoundation/ignition-core
```

## Usage

```js
const { buildModule, deploy } = require("@nomicfoundation/ignition-core");
// ...

const ignitionModule = buildModule("Example", (m) => {
  const lock = m.contract("Lock", [TEN_YEARS_IN_FUTURE]);

  return { lock };
});

const accounts = await hre.network.provider.request({
  method: "eth_accounts",
});

const result = await deploy({
  ignitionModule,
  accounts,
  provider: hre.network.provider,
  artifactResolver: {
    loadArtifact: function (contractName) {
      return hre.artifacts.readArtifact(contractName);
    },
    getBuildInfo: function (contractName) {
      // not needed for ephemeral deployments
      return undefined;
    },
  },
});

console.log(result);
```

## Contributing

Contributions are always welcome! Feel free to open any issue or send a pull request.

Go to [CONTRIBUTING.md](https://github.com/NomicFoundation/hardhat-ignition/blob/main/CONTRIBUTING.md) to learn about how to set up Hardhat Ignition's development environment.

## Feedback, help and news

[Hardhat Support Discord server](https://hardhat.org/ignition-discord): for questions and feedback.

[Follow Hardhat on Twitter.](https://twitter.com/HardhatHQ)
