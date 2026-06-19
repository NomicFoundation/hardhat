import { createDebug } from "@nomicfoundation/hardhat-utils/debug";

const log = createDebug("hardhat:core:cli:telemetry:performance:recorder");

/**
 * A value that can be attached to a task telemetry recording as a tag.
 */
export type TaskTelemetryTagValue = string | number | boolean;

/**
 * The in-memory representation of a single top-level task measurement.
 *
 * This is a plain Hardhat data structure on purpose: it intentionally does NOT
 * reference any `@sentry/*` type. The conversion to a Sentry transaction
 * envelope happens at flush time, in the performance sender, so that the Sentry
 * SDK is only loaded when a recording is actually being sent.
 */
export interface TaskTelemetryRecording {
  /** The formatted task id, e.g. `"build"`. */
  name: string;
  /** Start time, in seconds since the epoch (the unit Sentry transactions use). */
  startTime: number;
  /** End time, in seconds since the epoch. */
  endTime: number;
  /** Arbitrary key/value tags recorded by the task. */
  tags: Record<string, TaskTelemetryTagValue>;
}

/**
 * The generic infrastructure that any built-in task can hook into to record the
 * equivalent of a single span plus tag data.
 *
 * It is exposed on the HRE as `hre.telemetry`. A recorder is always present but
 * starts inactive, so `recordTag` is a near-free no-op until the CLI activates
 * it (only when telemetry is enabled and the run was sampled).
 */
export interface TaskTelemetry {
  /** Activates the recorder and starts measuring a top-level task. */
  start(name: string): void;
  /** Records a tag. No-op unless the recorder is active. */
  recordTag(key: string, value: TaskTelemetryTagValue): void;
  /** Whether a recording is currently active. */
  isActive(): boolean;
  /** Sends the recording via the detached process, if one is active. */
  flush(): Promise<void>;
}

function nowInSeconds(): number {
  return Date.now() / 1000;
}

/**
 * Creates a task telemetry recorder. The returned recorder is inactive until
 * `start` is called.
 */
export function createTaskTelemetryRecorder(): TaskTelemetry {
  let active = false;
  let name: string | undefined;
  let startTime = 0;
  let tags: Record<string, TaskTelemetryTagValue> = {};

  return {
    start(taskName) {
      active = true;
      name = taskName;
      startTime = nowInSeconds();
      tags = {};
      log("Started task telemetry recording for %s", taskName);
    },

    recordTag(key, value) {
      if (!active) {
        return;
      }
      tags[key] = value;
    },

    isActive() {
      return active;
    },

    async flush() {
      if (!active || name === undefined) {
        return;
      }

      const recording: TaskTelemetryRecording = {
        name,
        startTime,
        endTime: nowInSeconds(),
        tags,
      };

      // Lazy import so that `@sentry/core` and the transport are never loaded on
      // the standard (un-sampled) path.
      const { sendTaskTransaction } = await import(
        "../../cli/telemetry/performance/sender.js"
      );

      await sendTaskTransaction(recording);
    },
  };
}
