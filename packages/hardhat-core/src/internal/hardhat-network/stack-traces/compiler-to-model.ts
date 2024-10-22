import { requireNapiRsModule } from "../../../common/napi-rs";

const { createModelsAndDecodeBytecodes } = requireNapiRsModule(
  "@ignored/edr-optimism"
) as typeof import("@ignored/edr-optimism");

export { createModelsAndDecodeBytecodes };
