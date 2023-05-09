const { lazyFunction, lazyObject } = require("hardhat/plugins");

global.Web3 = lazyFunction(() => require("web3").Web3);
global.web3 = lazyObject(() => new global.Web3());

console.log(global.web3.eth.getAccounts.name);
