import type { NewTaskActionFunction } from "../../../types/tasks.js";

import {
  isTelemetryAllowed,
  setTelemetryEnabled,
} from "../../cli/telemetry/telemetry-permissions.js";

interface TelemetryActionArguments {
  enable: boolean;
  disable: boolean;
}

const showTelemetryConsent: NewTaskActionFunction<
  TelemetryActionArguments
> = async ({ enable, disable }) => {
  if (enable && disable) {
    console.error("Cannot enable and disable telemetry at the same time");
    process.exitCode = 1;
    return;
  }

  if (enable) {
    console.log("Enabling telemetry");
    await setTelemetryEnabled(true);
    return;
  }

  if (disable) {
    console.log("Disabling telemetry");
    await setTelemetryEnabled(false);
    return;
  }

  const consent = await isTelemetryAllowed();

  if (consent) {
    console.log(
      "Telemetry is now enabled, to disable it run `npx hardhat telemetry --disable`",
    );
  } else {
    console.log(
      "Telemetry is now disabled, to enable it run `npx hardhat telemetry --enable`",
    );
  }
};

export default showTelemetryConsent;
