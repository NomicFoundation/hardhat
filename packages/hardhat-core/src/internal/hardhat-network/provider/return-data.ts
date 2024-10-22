import { requireNapiRsModule } from "../../../common/napi-rs";

const { ReturnData } = requireNapiRsModule(
  "@ignored/edr-optimism"
) as typeof import("@ignored/edr-optimism");

export { ReturnData };
