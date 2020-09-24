usePlugin("@nomiclabs/buidler-waffle");

// This is a sample Buidler task. To learn how to create your own go to
// https://usehardhat.com/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(await account.getAddress());
  }
});

// You have to export an object to set up your config
// This object can have the following optional entries:
// defaultNetwork, networks, solc, and paths.
// Go to https://usehardhat.com/config/ to learn more
module.exports = {
  // This is a sample solidity configuration that specifies which version of solc to use
  solidity: {
    version: "0.6.8",
  },
};
