// ./ignition/LockModule.js
const { buildModule } = require("@ignored/hardhat-ignition");

const currentTimestampInSeconds = Math.round(new Date(2023, 01, 01) / 1000);
const TEN_YEAR_IN_SECS = 10 * 365 * 24 * 60 * 60;
const TEN_YEARS_IN_FUTURE = currentTimestampInSeconds + TEN_YEAR_IN_SECS;

const ONE_GWEI = hre.ethers.utils.parseUnits("1", "gwei");

module.exports = buildModule("LockModule", (m) => {
  const unlockTime = m.getOptionalParam("unlockTime", TEN_YEARS_IN_FUTURE);
  const lockedAmount = m.getOptionalParam("lockedAmount", ONE_GWEI);

  const lock = m.contract("Lock", { args: [unlockTime], value: lockedAmount });
  const lock2 = m.contract("Lock", { args: [unlockTime], value: lockedAmount });

  return { lock, lock2 };
});
