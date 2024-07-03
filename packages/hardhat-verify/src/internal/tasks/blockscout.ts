import type { VerifyTaskArgs } from "../../index";
import { subtask } from "hardhat/config";
import { TASK_VERIFY_BLOCKSCOUT } from "../task-names";

/**
 * Main Blockscout verification subtask.
 *
 * Verifies a contract in Blockscout by coordinating various subtasks related
 * to contract verification.
 */
subtask(TASK_VERIFY_BLOCKSCOUT).setAction(
  async (
    _taskArgs: VerifyTaskArgs,
    { config: _config, network: _network, run: _run }
  ) => {
    console.log("HELLO ");
  }
);
