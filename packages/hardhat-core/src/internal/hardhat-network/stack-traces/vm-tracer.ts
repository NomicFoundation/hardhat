import { requireNapiRsModule } from "../../../common/napi-rs";

const { VmTracer } = requireNapiRsModule(
  "@nomicfoundation/edr"
) as typeof import("@nomicfoundation/edr");

export { VmTracer as VMTracer };
