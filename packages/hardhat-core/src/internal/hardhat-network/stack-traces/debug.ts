import { requireNapiRsModule } from "../../../common/napi-rs";

const { printMessageTrace, printStackTrace } = requireNapiRsModule(
  "@ignored/edr-optimism"
) as typeof import("@ignored/edr-optimism");

export { printMessageTrace, printStackTrace };
