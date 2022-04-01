import "./types";
import { supportBigNumber } from "./bigNumber";

export function hardhatChaiMatchers(
  chai: Chai.ChaiStatic,
  utils: Chai.ChaiUtils
) {
  supportBigNumber(chai.Assertion, utils);
}
