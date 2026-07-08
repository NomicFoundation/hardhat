require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
// hardhat-tracer adds the --trace / --fulltrace / --v..--vvvv flags to
// `hardhat test`. It is the plugin that renders [SLOAD]/[SSTORE] lines.
require("hardhat-tracer");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  // Same compiler as the HH3 project so the bytecode (and therefore the
  // storage layout / opcodes) is identical on both sides.
  solidity: "0.8.9",
};
