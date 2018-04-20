const env = require("./env");

console.log("Sool env's web3 provider's host:", env.web3.currentProvider.host);
env.getContract("Contract").then(console.log);
