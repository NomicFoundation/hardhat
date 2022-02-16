import "../types";
import { supportBigNumber } from "./bigNumber";

export function bnChai(chai: Chai.ChaiStatic, utils: Chai.ChaiUtils) {
  supportBigNumber(chai.Assertion, utils);
}
