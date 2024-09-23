import { requireNapiRsModule } from "../../../common/napi-rs";

const { createModelsAndDecodeBytecodes } = requireNapiRsModule(
  "@nomicfoundation/edr"
) as typeof import("@nomicfoundation/edr");

export { createModelsAndDecodeBytecodes };
