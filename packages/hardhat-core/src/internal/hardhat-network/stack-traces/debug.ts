import { requireNapiRsModule } from "../../../common/napi-rs";

const { printMessageTrace, printStackTrace } = requireNapiRsModule(
  "@nomicfoundation/edr"
) as typeof import("@nomicfoundation/edr");

export { printMessageTrace, printStackTrace };
