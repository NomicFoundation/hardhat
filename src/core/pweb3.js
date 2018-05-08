"use strict";

const Web3 = require("web3");
const { promisify } = require("util");

function promisifyWeb3(web3) {
  const WEB3_MODULES = ["eth", "db", "shh", "net", "personal", "bzz"];

  const pweb3 = new Web3(web3.currentProvider);

  for (const module of WEB3_MODULES) {
    for (const prop of Object.keys(web3[module])) {
      const desc = Object.getOwnPropertyDescriptor(pweb3[module], prop);

      if (desc.get === undefined && pweb3[module][prop] instanceof Function) {
        pweb3[module][prop] = promisify(pweb3[module][prop]);
      }
    }
  }

  return pweb3;
}

module.exports = { promisifyWeb3 };
