export function initializeWaffleMatchers(projectRoot: string) {
  try {
    // We use the projectRoot to guarantee that we are using the user's
    // installed version of chai
    const chaiPath = require.resolve("chai", {
      paths: [projectRoot],
    });

    const chai = require(chaiPath);
    const { waffleChai } = require("./waffle-chai");

    chai.use(waffleChai);
  } catch (error) {
    // If chai isn't installed we just don't initialize the matchers
  }
}
