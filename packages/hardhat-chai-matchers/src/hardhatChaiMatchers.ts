import "./types";
import { supportBigNumber } from "./bigNumber";
import { supportEmit } from "./emit";
import { supportHexEqual } from "./hexEqual";
import { supportProperAddress } from "./properAddress";
import { supportProperPrivateKey } from "./properPrivateKey";
import { supportChangeEtherBalance } from "./changeEtherBalance";
import { supportChangeEtherBalances } from "./changeEtherBalances";
import { supportReverted } from "./reverted/reverted";
import { supportRevertedWith } from "./reverted/revertedWith";
import { supportRevertedWithCustomError } from "./reverted/revertedWithCustomError";
import { supportRevertedWithPanic } from "./reverted/revertedWithPanic";
import { supportRevertedWithoutReasonString } from "./reverted/revertedWithoutReasonString";

export function hardhatChaiMatchers(
  chai: Chai.ChaiStatic,
  utils: Chai.ChaiUtils
) {
  supportBigNumber(chai.Assertion, utils);
  supportEmit(chai.Assertion);
  supportHexEqual(chai.Assertion);
  supportProperAddress(chai.Assertion);
  supportProperPrivateKey(chai.Assertion);
  supportChangeEtherBalance(chai.Assertion);
  supportChangeEtherBalances(chai.Assertion);
  supportReverted(chai.Assertion);
  supportRevertedWith(chai.Assertion);
  supportRevertedWithCustomError(chai.Assertion, utils);
  supportRevertedWithPanic(chai.Assertion);
  supportRevertedWithoutReasonString(chai.Assertion);
}
