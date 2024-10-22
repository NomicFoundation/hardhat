import { requireNapiRsModule } from "../../../../common/napi-rs";

const { ExitCode } = requireNapiRsModule(
  "@ignored/edr-optimism"
) as typeof import("@ignored/edr-optimism");

export { ExitCode };
