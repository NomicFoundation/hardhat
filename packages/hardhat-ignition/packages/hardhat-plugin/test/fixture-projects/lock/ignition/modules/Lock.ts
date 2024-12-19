import { buildModule } from "@nomicfoundation/ignition-core";

const LockModule = buildModule("LockModule", (m) => {
  const unlockTime = m.getParameter("unlockTime");
  const lockedAmount = m.getParameter("lockedAmount", 1_000_000_000n);

  const lock = m.contract("Lock", [unlockTime], {
    value: lockedAmount,
  });

  return { lock };
});

// eslint-disable-next-line import/no-default-export
export default LockModule;
