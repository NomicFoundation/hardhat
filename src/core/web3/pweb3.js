"use strict";

const importLazy = require("import-lazy")(require);
const { promisify } = require("util");
const Web3 = importLazy("web3");

const { BuidlerError, ERRORS } = require("../errors");

function promisifyWeb3(web3) {
  const WEB3_MODULES = ["eth", "db", "shh", "net", "personal", "bzz"];

  const pweb3 = new Web3(web3.currentProvider);

  for (const module of WEB3_MODULES) {
    pweb3[module] = {};

    for (const prop in web3[module]) {
      const desc = Object.getOwnPropertyDescriptor(web3[module], prop);

      if (desc === undefined) {
        Object.defineProperty(pweb3[module], prop, {
          get: () => {
            throw new BuidlerError(
              ERRORS.PWEB3_NOT_SUPPORTED,
              `pweb3.${module}.${prop}`
            );
          }
        });
      } else if (desc.get !== undefined) {
        Object.defineProperty(pweb3[module], prop, {
          get: () => {
            throw new BuidlerError(
              ERRORS.PWEB3_NO_SYNC,
              `pweb3.${module}.${prop}`
            );
          }
        });
      } else if (web3[module][prop] instanceof Function) {
        pweb3[module][prop] = promisify(web3[module][prop].bind(web3[module]));
      }
    }
  }

  return pweb3;
}

module.exports = { promisifyWeb3 };
