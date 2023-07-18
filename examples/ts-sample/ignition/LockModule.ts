import { defineModule } from "@ignored/hardhat-ignition";
import hre from "hardhat";

const currentTimestampInSeconds = Math.round(
  new Date(2023, 1, 1).valueOf() / 1000
);
const TEN_YEAR_IN_SECS = 10 * 365 * 24 * 60 * 60;
const TEN_YEARS_IN_FUTURE = currentTimestampInSeconds + TEN_YEAR_IN_SECS;

const ONE_GWEI = hre.ethers.utils.parseUnits("1", "gwei").toString();

const LockModule = defineModule("LockModule", (m) => {
  const unlockTime = m.getParameter("unlockTime", TEN_YEARS_IN_FUTURE);
  const lockedAmount = m.getParameter("lockedAmount", BigInt(ONE_GWEI));

  const lock = m.contract("Lock", [unlockTime], {
    value: lockedAmount,
  });

  return { lock };
});

export default LockModule;
