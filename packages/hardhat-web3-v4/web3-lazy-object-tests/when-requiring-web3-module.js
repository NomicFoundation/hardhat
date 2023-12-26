const { lazyFunction, lazyObject } = require("hardhat/plugins");

global.Web3 = lazyFunction(() => require("web3"));
global.web3 = lazyObject(() => new global.Web3());

require("web3");
