# 2. Setting up the environment

Most Ethereum libraries and tools are written in JavaScript, and so is Hardhat. If you're not familiar with Node.js, it's a JavaScript runtime built on Chrome's V8 JavaScript engine. It's the most popular solution to run JavaScript outside of a web browser and Hardhat is built on top of it.

:::tip

[Hardhat for Visual Studio Code](/hardhat-vscode) is the official Hardhat extension that adds advanced support for Solidity to VSCode. If you use Visual Studio Code, give it a try!

:::

## Installing Node.js

You can [skip](./creating-a-new-hardhat-project.md) this section if you already have a working Node.js `>=16.0` installation. If not, here's how to install it on Ubuntu, MacOS and Windows.

### Linux

#### Ubuntu

Copy and paste these commands in a terminal:

```
sudo apt update
sudo apt install curl git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### MacOS

Make sure you have `git` installed. Otherwise, follow [these instructions](https://www.atlassian.com/git/tutorials/install-git).

There are multiple ways of installing Node.js on MacOS. We will be using [Node Version Manager (nvm)](http://github.com/creationix/nvm). Copy and paste these commands in a terminal:

```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
nvm install 20
nvm use 20
nvm alias default 20
npm install npm --global # Upgrade npm to the latest version
```

### Windows

If you are using Windows, we **strongly recommend** you use Windows Subsystem for Linux (also known as WSL 2). You can use Hardhat without it, but it will work better if you use it.

To install Node.js using WSL 2, please read [this guide](https://docs.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-on-wsl).

Make sure you also [have `git` installed on WSL](https://docs.microsoft.com/en-us/windows/wsl/tutorials/wsl-git).

## Upgrading your Node.js installation

If your version of Node.js is older and [not supported by Hardhat](../hardhat-runner/docs/reference/stability-guarantees.md#node.js-versions-support) follow the instructions below to upgrade.

### Linux

#### Ubuntu

1. Run `sudo apt remove nodejs` in a terminal to remove Node.js.
2. Find the version of Node.js that you want to install [here](https://github.com/nodesource/distributions#debinstall) and follow the instructions.
3. Run `sudo apt update && sudo apt install nodejs` in a terminal to install Node.js again.

### MacOS

You can change your Node.js version using [nvm](http://github.com/creationix/nvm). To upgrade to Node.js `20.x` run these in a terminal:

```
nvm install 20
nvm use 20
nvm alias default 20
npm install npm --global # Upgrade npm to the latest version
```

### Windows

You need to follow the [same installation instructions](#windows) as before but choose a different version. You can check the list of all available versions [here](https://nodejs.org/en/download/releases/).
