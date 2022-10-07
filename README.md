# Ignition

> **WARNING**: This repository is **highly experimental**, and is under **active development**. Any code or binaries produced from this project **should not be used in any production or critical workloads**. The API is preliminary, **the API will change**.

Ignition is **Hardhat**'s deployment solution. It is a **Hardhat** plugin that allows you to create declarative deployments that can be reproduced across different networks.

Built by the [Nomic Foundation](https://nomic.foundation/) for the Ethereum community.

Join our [Hardhat Support Discord server](https://hardhat.org/discord) to stay up to date on new releases, plugins and tutorials.

## Installation

Add **Ignition** as a plugin to an existing [Hardhat](https://hardhat.org/) project:

```shell
npm install @ignored/hardhat-ignition
```

Modify your `hardhat.config.{ts,js}` file, to include Ignition:

```javascript
// ...
import "@ignored/hardhat-ignition";
```

## Getting Started

See our [Getting started guide](./docs/getting-started-guide.md) for a worked example of **Ignition usage**.

## Documentation

- [Creating modules for deployment](./docs/creating-modules-for-deployment.md)

### Examples

- [Simple](./examples/simple/README.md)
- [ENS](./examples/ens/README.md)
- [Create2](./examples/create2/README.md)
- [Uniswap](./examples/uniswap/README.md)

## Contributing

Contributions are always welcome! Feel free to open any issue or send a pull request.

Go to [CONTRIBUTING.md](./CONTRIBUTING.md) to learn about how to set up Ignition's development environment.

## Feedback, help and news

[Hardhat Support Discord server](https://hardhat.org/discord): for questions and feedback.

[Follow Hardhat on Twitter.](https://twitter.com/HardhatHQ)
