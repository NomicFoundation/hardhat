---
prev: false
---

# 1. Setting up the environment

Most Ethereum libraries and tools use Node.js and **Buidler** is no exception. In case you are not familiar with Node.js, you might think of it as "JavaScript running on your computer" — but it’s so much more as well. For now we are just installing it.

## Installing Node.js

This section has instructions for installing Node.js in the operating system of your choice. Feel free to skip any step you don't consider necessary.

::: warning
If you have Node.js `>=10.0` already installed, please skip to: [Checking your environment](#checking-your-environment).
:::

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

There are multiple ways of installing Node.js in MacOs, we will be using [Node Version Manager (nvm)](http://github.com/creationix/nvm). Copy and paste these commands in a terminal:

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

Installing Node.js on Windows requires some manual installations first. Please follow them.

1. If you don't have `git` installed, please [download and install it](https://git-scm.com/download/win).
2. Install Node.js 10.x by going to [its download page](https://nodejs.org/dist/latest-v10.x), downloading `node-v10.XX.XX-x64.msi`, and running it.
3. [Open your terminal as Administrator](https://www.howtogeek.com/194041/how-to-open-the-command-prompt-as-administrator-in-windows-8.1/) and run the following command: `npm install --global --production windows-build-tools`. It will take several minutes and may download a few GB of data.


## Checking your environment

To make sure your development environment is ready, copy and paste these commands in a new terminal:

```
git clone https://github.com/nomiclabs/ethereum-hackathon-setup-checker.git
cd ethereum-hackathon-setup-checker
npm install
```

If they went well, you should see a confirmation message meaning that your development environment is ready. Feel free to remove the repository and refer to the next step: [Installing Buidler.](../2-install/)

If any of them failed, your environment is not ready. Make sure to have `git` and Node.js `>=10.0` installed. If you have an older version of Node.js, please refer to the next section. If the issues persists, please contact us on our [Telegram Support Channel](https://t.me/BuidlerSupport).

## Upgrading your version of Node.js

If your version of Node.js is too old (`<10.0`) follow these instructions. After you are done, go back to [Checking your environment](#checking-your-environment).

### Linux

#### Ubuntu

1. Remove nodejs with `sudo apt remove nodejs`.
2. Go to the [NodeSource's Node.js Binary Distributions](https://github.com/nodesource/distributions#debinstall), and install their PPA for the version of Node.js that you are looking for.
3. Run `sudo apt update && sudo apt install nodejs`

### MacOS

You can change your Node.js version using [nvm](http://github.com/creationix/nvm).

For example, this is how you'd upgrade to Node.js 12.x:

```
nvm install 12
nvm use 12
nvm alias default 12
npm install npm --global # Upgrade npm to the latest version
npm install -g node-gyp # Make sure we have node-gyp installed
```

### Windows

You need to follow the same installation instructions but choosing [another version of Node.js from its website](https://nodejs.org/en/download/releases/).
