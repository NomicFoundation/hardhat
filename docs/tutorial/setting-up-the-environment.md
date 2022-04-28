---
prev: false
---

# 2. Setting up the environment

Most Ethereum libraries and tools are written in JavaScript, and so is **Hardhat**. If you're not familiar with Node.js, it's a JavaScript runtime built on Chrome's V8 JavaScript engine. It's the most popular solution to run JavaScript outside of a web browser and **Hardhat** is built on top of it.

## Installing Node.js

You can [skip](./creating-a-new-hardhat-project.md) this section if you already have a working Node.js `>=12.0` installation. If not, here's how to install it on Ubuntu, MacOS and Windows.

### Linux

#### Ubuntu

Copy and paste these commands in a terminal:

```
sudo apt update
sudo apt install curl git
curl -sL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install nodejs
```

### MacOS

Make sure you have `git` installed. Otherwise, follow [these instructions](https://www.atlassian.com/git/tutorials/install-git).

There are multiple ways of installing Node.js on MacOS. We will be using [Node Version Manager (nvm)](http://github.com/creationix/nvm). Copy and paste these commands in a terminal:

```
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.39.1/install.sh | bash
nvm install 16
nvm use 16
nvm alias default 16
npm install npm --global # Upgrade npm to the latest version
```

### Windows

Installing Node.js on Windows requires a few manual steps. We'll install git, Node.js 16.x and npm. Download and run these:

1. [Git's installer for Windows](https://git-scm.com/download/win)
2. `node-v16.XX.XX-x64.msi` from [here](https://nodejs.org/dist/latest-v16.x)

## Upgrading your Node.js installation

If your version of Node.js is older than `16.0` follow the instructions below to upgrade.

### Linux

#### Ubuntu

1. Run `sudo apt remove nodejs` in a terminal to remove Node.js.
2. Find the version of Node.js that you want to install [here](https://github.com/nodesource/distributions#debinstall) and follow the instructions.
3. Run `sudo apt update && sudo apt install nodejs` in a terminal to install Node.js again.

### MacOS

You can change your Node.js version using [nvm](http://github.com/creationix/nvm). To upgrade to Node.js `16.x` run these in a terminal:

```
nvm install 16
nvm use 16
nvm alias default 16
npm install npm --global # Upgrade npm to the latest version
```

### Windows

You need to follow the [same installation instructions](#windows) as before but choose a different version. You can check the list of all available versions [here](https://nodejs.org/en/download/releases/).
