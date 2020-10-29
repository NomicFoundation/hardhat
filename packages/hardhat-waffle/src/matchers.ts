import type ChaiStatic from "chai";

import type { waffleChai as waffleChaiT } from "./waffle-chai";

export function initializeWaffleMatchers(projectRoot: string) {
  try {
    const chai: typeof ChaiStatic = require("chai");
    const {
      waffleChai,
    }: { waffleChai: typeof waffleChaiT } = require("./waffle-chai");

    chai.use(waffleChai);
  } catch (error) {
    // If chai isn't installed we just don't initialize the matchers
  }
}
