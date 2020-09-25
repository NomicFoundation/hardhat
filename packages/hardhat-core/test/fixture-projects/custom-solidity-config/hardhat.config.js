const optimizer = {
  enabled: false,
  runs: 200,
};

module.exports = {
  solidity: {
    compilers: [
      { version: "0.5.5", optimizer },
      { version: "0.6.7", optimizer },
    ],
  },
};
