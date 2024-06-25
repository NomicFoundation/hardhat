import { requireNapiRsModule } from "../../../common/napi-rs";

const { ContractsIdentifier } = requireNapiRsModule(
  "@nomicfoundation/edr"
) as typeof import("@nomicfoundation/edr");

export { ContractsIdentifier };
