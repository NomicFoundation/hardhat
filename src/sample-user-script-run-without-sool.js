const env = require("./env");

env.run("compile").then(() => {
  console.log("Sool env's web3 provider's host:", env.web3.currentProvider.host);
  env.getContract("Contract").then(console.log);
});

