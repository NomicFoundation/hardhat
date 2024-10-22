import { requireNapiRsModule } from "../../../common/napi-rs";

const { VmTracer } = requireNapiRsModule(
  "@ignored/edr-optimism"
) as typeof import("@ignored/edr-optimism");

export { VmTracer as VMTracer };
