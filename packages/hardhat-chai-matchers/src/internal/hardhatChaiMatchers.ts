import { supportBigNumber } from "./bigNumber";
import { supportEmit } from "./emit";
import { supportHexEqual } from "./hexEqual";
import { supportProperAddress } from "./properAddress";
import { supportProperHex } from "./properHex";
import { supportProperPrivateKey } from "./properPrivateKey";
import { supportChangeEtherBalance } from "./changeEtherBalance";
import { supportChangeEtherBalances } from "./changeEtherBalances";
import { supportChangeTokenBalance } from "./changeTokenBalance";
import { supportReverted } from "./reverted/reverted";
import { supportRevertedWith } from "./reverted/revertedWith";
import { supportRevertedWithCustomError } from "./reverted/revertedWithCustomError";
import { supportRevertedWithPanic } from "./reverted/revertedWithPanic";
import { supportRevertedWithoutReason } from "./reverted/revertedWithoutReason";
import { supportWithArgs } from "./withArgs";

export function hardhatChaiMatchers(
  chai: Chai.ChaiStatic,
  utils: Chai.ChaiUtils
) {
  supportBigNumber(chai.Assertion, utils);
  supportEmit(chai.Assertion, utils);
  supportHexEqual(chai.Assertion);
  supportProperAddress(chai.Assertion);
  supportProperHex(chai.Assertion);
  supportProperPrivateKey(chai.Assertion);
  supportChangeEtherBalance(chai.Assertion);
  supportChangeEtherBalances(chai.Assertion);
  supportChangeTokenBalance(chai.Assertion);
  supportReverted(chai.Assertion);
  supportRevertedWith(chai.Assertion);
  supportRevertedWithCustomError(chai.Assertion, utils);
  supportRevertedWithPanic(chai.Assertion);
  supportRevertedWithoutReason(chai.Assertion);
  supportWithArgs(chai.Assertion, utils);
}
