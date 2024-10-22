import { requireNapiRsModule } from "../../../common/napi-rs";

const { linkHexStringBytecode } = requireNapiRsModule(
  "@ignored/edr-optimism"
) as typeof import("@ignored/edr-optimism");

export { linkHexStringBytecode };
