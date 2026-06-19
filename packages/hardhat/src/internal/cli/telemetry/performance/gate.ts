import type { HardhatRuntimeEnvironment } from "../../../../types/hre.js";

import { createDebug } from "@nomicfoundation/hardhat-utils/debug";

import { formatTaskId } from "../../../core/tasks/utils.js";
import { isRunningInsideHardhatMonorepo } from "../error-classification/codebase-dependent-helpers.js";
import {
  isTelemetryAllowed,
  isTelemetryAllowedInEnvironment,
} from "../telemetry-permissions.js";

const log = createDebug("hardhat:core:cli:telemetry:performance:gate");

/**
 * The probability that a given run is sampled for performance telemetry in
 * production. In dev (running from the monorepo source) we always sample.
 */
const PRODUCTION_SAMPLE_RATE = 0.01;

/**
 * Decides whether the given run should be sampled for performance telemetry.
 *
 * This is a cheap synchronous decision so that the standard (un-sampled) path
 * never reads files or loads heavy modules.
 */
function shouldSampleTaskTelemetry(): boolean {
  if (isRunningInsideHardhatMonorepo()) {
    return true;
  }

  return Math.random() < PRODUCTION_SAMPLE_RATE;
}

/**
 * Checks telemetry permissions and performs sampling before a top-level task
 * runs. If the run is both allowed and sampled, the HRE's telemetry recorder is
 * activated; otherwise this is a no-op and nothing is recorded.
 *
 * The ordering is intentional: the cheap environment check and the synchronous
 * sampling decision run first, and the file-backed "enabled" check only runs in
 * the sampled case, keeping the standard path free of I/O and heavy imports.
 */
export async function maybeStartTaskTelemetry(
  hre: HardhatRuntimeEnvironment,
  taskId: string[],
): Promise<void> {
  if (!isTelemetryAllowedInEnvironment()) {
    return;
  }

  if (!shouldSampleTaskTelemetry()) {
    log("Run not sampled for performance telemetry");
    return;
  }

  if (!(await isTelemetryAllowed())) {
    return;
  }

  hre.telemetry.start(formatTaskId(taskId));
}
