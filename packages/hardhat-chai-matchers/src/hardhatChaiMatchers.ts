import "./types";
import { supportBigNumber } from "./bigNumber";
import { supportEmit } from "./emit";
import { supportReverted } from "./reverted";
import { supportHexEqual } from "./hexEqual";
import { supportProperAddress } from "./properAddress";
import { supportProperPrivateKey } from "./properPrivateKey";

export function hardhatChaiMatchers(
  chai: Chai.ChaiStatic,
  utils: Chai.ChaiUtils
) {
  supportBigNumber(chai.Assertion, utils);
  supportEmit(chai.Assertion);
  supportReverted(chai.Assertion);
  supportHexEqual(chai.Assertion);
  supportProperAddress(chai.Assertion);
  supportProperPrivateKey(chai.Assertion);
}
