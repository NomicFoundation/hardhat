import { Ignition } from "../../src";
import { IgnitionImplementation } from "../../src/internal/Ignition";
import { ExactInterface } from "../helpers/exact-interface";
import { getMockProviders } from "../helpers/getMockProviders";

describe("IgnitionImplementation", function () {
  it("Shouldn't have any property apart from the ones defined in the Ignition interface", function () {
    const _implementation: ExactInterface<Ignition, IgnitionImplementation> =
      IgnitionImplementation.create({ providers: getMockProviders() });
  });
});
