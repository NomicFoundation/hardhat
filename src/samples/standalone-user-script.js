"use strict";

const env = require("../core/importable-environment");

env.run("compile").then(() => {
  console.log(
    "Buidler env's web3 provider's host:",
    env.web3.currentProvider.host
  );
  env.getContract("Contract").then(console.log);
});
