import type { DeploymentState } from "../types/deployment-state";

import { getPendingNonceAndSender } from "../../views/execution-state/get-pending-nonce-and-sender";

export function getMaxNonceUsedBySender(deploymentState: DeploymentState): {
  [sender: string]: number;
} {
  const nonces: {
    [sender: string]: number;
  } = {};

  for (const executionState of Object.values(deploymentState.executionStates)) {
    const pendingNonceAndSender = getPendingNonceAndSender(executionState);

    if (pendingNonceAndSender === undefined) {
      continue;
    }

    const { sender, nonce } = pendingNonceAndSender;

    if (nonces[sender] === undefined) {
      nonces[sender] = nonce;
    } else {
      nonces[sender] = Math.max(nonces[sender], nonce);
    }
  }

  return nonces;
}
