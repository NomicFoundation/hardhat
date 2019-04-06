import { BuidlerPluginError } from "@nomiclabs/buidler/plugins";
import { promisify } from "util";

export function promisifyWeb3(web3: any) {
  const WEB3_MODULES = ["eth", "db", "shh", "net", "personal", "bzz"];

  const Web3 = require("web3");
  const pweb3 = new Web3(web3.currentProvider);

  for (const module of WEB3_MODULES) {
    pweb3[module] = {};

    // tslint:disable-next-line forin
    for (const prop in web3[module]) {
      const desc = Object.getOwnPropertyDescriptor(web3[module], prop);

      if (desc === undefined) {
        Object.defineProperty(pweb3[module], prop, {
          get: () => {
            throw new BuidlerPluginError(
              `pweb3.${module}.${prop} is not supported.`
            );
          }
        });
      } else if (desc.get !== undefined) {
        Object.defineProperty(pweb3[module], prop, {
          get: () => {
            throw new BuidlerPluginError(
              "pweb3 doesn't support synchronous calls."
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
