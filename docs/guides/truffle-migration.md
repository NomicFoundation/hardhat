---
prev: false
next: false
---
# Migrating from Truffle

In this guide, we will show you how to use the Buidler Truffle integration plugins that allow you to use TruffleContract with Buidler. This means that you can use the `contract()` function you always use in your Truffle tests and elsewhere.

Use the plugin that corresponds to the Truffle version you wrote your tests with: [buidler-truffle4](https://github.com/nomiclabs/buidler-truffle4) or [buidler-truffle5](https://github.com/nomiclabs/buidler-truffle5). To make it a real example, let’s go through the process of running an existing project’s Truffle 5 tests with Buidler.

What better project to showcase this than [OpenZeppelin](https://openzeppelin.org), the widely-used smart contract development framework from our friends at [Zeppelin](https://zeppelin.solutions/).

Let’s checkout the Github repo and install its dependencies:

```sh
git clone git@github.com:OpenZeppelin/openzeppelin-solidity.git
cd openzeppelin-solidity/
git checkout v2.1.2 -b buidler-migration
npm install
```

Install Buidler and the Truffle 5 plugin:

```sh
npm install @nomiclabs/buidler @nomiclabs/buidler-truffle5 @nomiclabs/buidler-web3 web3@1.0.0-beta.37
```

Then put the following into `buidler.config.js`:

```js
require("@nomiclabs/buidler-truffle5");

module.exports = {
  solc: {version: "0.5.2"}
};
```

And that’s it. Run `npx buidler test` to run all the tests. They will work.

You may think “What if my tests are written with Truffle 4?” Well, there’s a plugin for that.

```npm install @nomiclabs/buidler-truffle4 @nomiclabs/buidler-web3-legacy web3@0.20.7```

Set the appropriate compiler version in `buidler.config.js`, `require()` the plugin, and you’re good to go.

For any questions or feedback you may have, you can find us in the [Buidler Support Telegram group](http://t.me/BuidlerSupport).