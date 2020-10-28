task("my-task", "This is a custom task")
  .addFlag("myFlag", "Flag description")
  .addParam("param", "Param description")
  .setAction(() => {})

module.exports = {
  solidity: "0.7.3",
};
