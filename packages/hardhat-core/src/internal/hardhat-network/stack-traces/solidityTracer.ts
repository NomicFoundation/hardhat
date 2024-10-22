import { requireNapiRsModule } from "../../../common/napi-rs";

const { SolidityTracer } = requireNapiRsModule(
  "@ignored/edr-optimism"
) as typeof import("@ignored/edr-optimism");

export { SolidityTracer };
