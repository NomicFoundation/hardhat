// This project is compiled from scratch multiple times in the same test, which
// produces a lot of logs. We override this task to omit those logs.
subtask("compile:solidity:log:compilation-result", () => {});

module.exports = {
  solidity: "0.7.3",
};
