import "./types";
import { supportBigNumber } from "./bigNumber";
import { supportEmit } from "./emit";

export function hardhatChaiMatchers(
  chai: Chai.ChaiStatic,
  utils: Chai.ChaiUtils
) {
  supportBigNumber(chai.Assertion, utils);
  supportEmit(chai.Assertion);
}
