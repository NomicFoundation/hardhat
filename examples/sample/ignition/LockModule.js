// ./ignition/LockModule.js
const { buildModule } = require("@ignored/hardhat-ignition");

const currentTimestampInSeconds = Math.round(Date.now() / 1000);
const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
const ONE_YEAR_IN_FUTURE = currentTimestampInSeconds + ONE_YEAR_IN_SECS;

const ONE_GWEI = hre.ethers.utils.parseUnits("1", "gwei");

module.exports = buildModule("LockModule", (m) => {
  const unlockTime = m.getOptionalParam("unlockTime", ONE_YEAR_IN_FUTURE);
  const lockedAmount = m.getOptionalParam("lockedAmount", ONE_GWEI);

  const lock = m.contract("Lock", { args: [unlockTime], value: lockedAmount });

  return { lock };
});
