import type {
  IgnitionModule,
  NamedArtifactContractDeploymentFuture,
} from "@nomicfoundation/ignition-core";

// eslint-disable-next-line import/no-extraneous-dependencies
import { buildModule } from "@nomicfoundation/ignition-core";

const LockModule: IgnitionModule<
  "LockModule",
  string,
  {
    lock: NamedArtifactContractDeploymentFuture<"Lock">;
  }
> = buildModule("LockModule", (m) => {
  const unlockTime = m.getParameter("unlockTime");
  const lockedAmount = m.getParameter("lockedAmount", 1_000_000_000n);

  const lock = m.contract("Lock", [unlockTime], {
    value: lockedAmount,
  });

  return { lock };
});

export default LockModule;
