task("twice", async (_, hre) => {
  await hre.run("test", { noCompile: true });
  await hre.run("test", { noCompile: true });

  return true;
});

module.exports = {
  solidity: "0.8.3",
  mocha: {
    // disable test output of the fixture so that
    // the output of the fixture isn't mixed with
    // the output of the hardhat tests
    reporter: function () {},
  },
};
