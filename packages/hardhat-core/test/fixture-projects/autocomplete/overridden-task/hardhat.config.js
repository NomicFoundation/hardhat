task("test").setAction((taskArgs, hre, runSuper) => {
  console.log("about to run a test");

  return runSuper();
});

task("compile").setAction((taskArgs, hre, runSuper) => {
  console.log("first compile override");

  return runSuper();
});

task("compile").setAction((taskArgs, hre, runSuper) => {
  console.log("second compile override");

  return runSuper();
});

module.exports = {
  solidity: "0.7.3",
};
