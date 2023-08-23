import { IgnitionError } from "../../errors";

import { DeploymentLoader } from "./deployment-loader/types";
import {
  applyNewMessage,
  loadDeploymentState,
} from "./new-execution/deployment-state-helpers";
import {
  JournalMessageType,
  WipeExecutionStateMessage,
} from "./new-execution/types/messages";

export class Wiper {
  constructor(private _deploymentLoader: DeploymentLoader) {}

  public async wipe(futureId: string) {
    const deploymentState = await loadDeploymentState(this._deploymentLoader);

    if (deploymentState === undefined) {
      throw new IgnitionError(
        `Cannot wipe ${futureId} as thie deployment hasn't been started`
      );
    }

    const executionState = deploymentState.executionStates[futureId];

    if (executionState === undefined) {
      throw new IgnitionError(
        `Cannot wipe ${futureId} as no state recorded against it`
      );
    }

    const dependents = Object.values(deploymentState.executionStates).filter(
      (psm) => psm.dependencies.has(futureId)
    );

    if (dependents.length > 0) {
      throw new IgnitionError(
        `Cannot wipe ${futureId} as there are dependent futures that have already started:\n${dependents
          .map((state) => `  ${state.id}\n`)
          .join()}`
      );
    }

    const wipeMessage: WipeExecutionStateMessage = {
      type: JournalMessageType.WIPE_EXECUTION_STATE,
      futureId,
    };

    await applyNewMessage(wipeMessage, deploymentState, this._deploymentLoader);
  }
}
