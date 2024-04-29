subtask("compile:solidity:get-remappings", () => {
  return {
    "foo/": "node_modules/foo/contracts/",
    "bar/": "node_modules/foo/contracts/",
  };
});

module.exports = {
  solidity: "0.8.19",
};
