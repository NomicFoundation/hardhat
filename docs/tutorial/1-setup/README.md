---
prev: false
---

# 1. Setting up the environment

Most Ethereum libraries and tools are written in JavaScript, and so is **Buidler**. If you're not familiar with Node.js, it's a JavaScript runtime built on Chrome's V8 JavaScript engine. It's the most popular solution to run JavaScript outside of a web browser and **Buidler** is built on top of it.

## Installing Node.js

You can [skip](#checking-your-environment) this section if you already have a working Node.js `>=10.0` installation. If not, here's how to install it on Ubuntu, MacOS and Windows.


### Linux

#### Ubuntu

Copy and paste these commands in a terminal:

```
sudo apt update
sudo apt install curl git
sudo apt install build-essential # We need this to build native dependencies
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
sudo apt install nodejs
```

### MacOS

Make sure you have `git` installed. Otherwise, follow [these instructions](https://www.atlassian.com/git/tutorials/install-git).

There are multiple ways of installing Node.js on MacOS. We will be using [Node Version Manager (nvm)](http://github.com/creationix/nvm). Copy and paste these commands in a terminal:

```
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.35.2/install.sh | bash
nvm install 10
nvm use 10
nvm alias default 10
npm install npm --global # Upgrade npm to the latest version
npm install -g node-gyp # Make sure we have node-gyp installed
# This next setp is needed to build native dependencies.
# A popup will appear and you have to proceed with an installation.
# It will take some time, and may download a few GB of data.
xcode-select --install
```

### Windows

Installing Node.js on Windows requires a few manual steps. We'll install git, Node.js 10.x and NPM's Windows Build Tools. Download and run these:
1. [Git's installer for Windows](https://git-scm.com/download/win)
2. `node-v10.XX.XX-x64.msi` from [here](https://nodejs.org/dist/latest-v10.x)

Then [open your terminal as Administrator](https://www.howtogeek.com/194041/how-to-open-the-command-prompt-as-administrator-in-windows-8.1/) and run the following command: 
```
npm install --global --production windows-build-tools
```

It will take several minutes and may download a few GB of data.


## Checking your environment

To make sure your development environment is ready, copy and paste these commands in a new terminal:

```
git clone https://github.com/nomiclabs/ethereum-hackathon-setup-checker.git
cd ethereum-hackathon-setup-checker
npm install
```

If this is succesful you should see a confirmation message meaning that your development environment is ready. Feel free to delete the repository directory and move on to [Installing Buidler.](../2-install/)

If any of them failed, your environment is not properly setup. Make sure you have `git` and Node.js `>=10.0` installed. If you're seeing errors mentioning "node-gyp", make sure you installed the build tools mentioned before.

If you have an older version of Node.js, please refer to the next section.

## Upgrading your Node.js installation

If your version of Node.js is older than `10.0` follow the instructions below to upgrade. After you are done, go back to [Checking your environment](#checking-your-environment).

### Linux

#### Ubuntu

1. Run `sudo apt remove nodejs` in a terminal to remove Node.js.
2. Find the version of Node.js that you want to install [here](https://github.com/nodesource/distributions#debinstall) and follow the instructions.
3. Run `sudo apt update && sudo apt install nodejs` in a terminal to install Node.js again.

### MacOS

You can change your Node.js version using [nvm](http://github.com/creationix/nvm). To upgrade to Node.js `12.x` run these in a terminal:

```
nvm install 12
nvm use 12
nvm alias default 12
npm install npm --global # Upgrade npm to the latest version
npm install -g node-gyp # Make sure we have node-gyp installed
```

### Windows

You need to follow the [same installation instructions](#windows) as before but choose a different version. You can check the list of all available versions [here](https://nodejs.org/en/download/releases/).
