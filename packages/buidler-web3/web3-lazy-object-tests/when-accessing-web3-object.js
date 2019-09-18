const { lazyFunction, lazyObject } = require("@nomiclabs/buidler/plugins");

global.Web3 = lazyFunction(() => require("web3"));
global.web3 = lazyObject(() => new global.Web3());

console.log(global.web3.eth.getAccounts.name);
