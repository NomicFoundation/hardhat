import { FactoryOptions } from "../src/types";

// FactoryOptions shouldn't have mandatory properties
const _factoryOptions: FactoryOptions = {};

// FactoryOptions only has these two properties.
// If new ones are added, then the deployContract
// implementation should be updated to also delete
// those new extra properties
const _factoryOptionsRequired: Required<FactoryOptions> = {
  signer: null as any,
  libraries: null as any,
};
