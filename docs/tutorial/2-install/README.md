# 2. Installing Buidler

We will install **Buidler** through `npm`. `npm` (Node Package Manager) is two things: first and foremost, it is an online repository for the publishing of open-source Node.js project such as **Buidler**; second, it is a command-line utility for interacting with said repository.

Open a new terminal, copy and paste these commands:

```
mkdir buidler-tutorial # Create a new folder
cd buidler-tutorial # Access the folder
npm init --yes # Initialize a new npm project
npm install --save-dev @nomiclabs/buidler # Install Buidler and dependencies
```

::: warning
**Buidler** package will also install all its dependencies, so it might take a while.
:::

## What is Buidler?
You might think of **Buidler** as a runtime environment designed around the concepts of tasks and plugins. This means interoperability and flexibility turning **Buidler** into the perfect toolkit for smart contract and dapp development.

It also comes with **Buidler EVM**, a local Ethereum network that allows you to test, debug and deploy your contracts more quickly. You can even use `console.log` inside your Solidity code. And no, that was not possible before **Buidler EVM** :sunglasses:

When installation completes, go to step 3: [Configuring Buidler.](../3-config/)
