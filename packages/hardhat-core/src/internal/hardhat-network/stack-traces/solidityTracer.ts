import { requireNapiRsModule } from "../../../common/napi-rs";

const { SolidityTracer } = requireNapiRsModule(
  "@nomicfoundation/edr"
) as typeof import("@nomicfoundation/edr");

export { SolidityTracer };
