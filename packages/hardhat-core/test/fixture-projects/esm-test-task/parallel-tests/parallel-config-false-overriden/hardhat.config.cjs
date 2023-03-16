module.exports = {
  solidity: "0.8.3",
  mocha: {
    parallel: false,
    // disable test output of the fixture so that
    // the output of the fixture isn't mixed with
    // the output of the hardhat tests
    reporter: function () {},
  },
};
