import { supportAddressable } from "./addressable.js";
import { supportBigNumber } from "./big-number.js";
import { supportChangeEtherBalance } from "./changeEtherBalance.js";
import { supportChangeEtherBalances } from "./changeEtherBalances.js";
import { supportChangeTokenBalance } from "./changeTokenBalance.js";
import { supportEmit } from "./emit.js";
import { supportHexEqual } from "./hexEqual.js";
import { supportProperAddress } from "./properAddress.js";
import { supportProperHex } from "./properHex.js";
import { supportProperPrivateKey } from "./properPrivateKey.js";
import { supportReverted } from "./reverted/reverted.js";
import { supportRevertedWith } from "./reverted/revertedWith.js";
import { supportRevertedWithCustomError } from "./reverted/revertedWithCustomError.js";
import { supportRevertedWithPanic } from "./reverted/revertedWithPanic.js";
import { supportRevertedWithoutReason } from "./reverted/revertedWithoutReason.js";
import { supportWithArgs } from "./withArgs.js";

export function hardhatChaiMatchers(
  chai: Chai.ChaiStatic,
  chaiUtils: Chai.ChaiUtils,
): void {
  supportAddressable(chai.Assertion, chaiUtils);
  supportBigNumber(chai.Assertion, chaiUtils);
  supportEmit(chai.Assertion, chaiUtils);
  supportHexEqual(chai.Assertion);
  supportProperAddress(chai.Assertion);
  supportProperHex(chai.Assertion);
  supportProperPrivateKey(chai.Assertion);
  supportChangeEtherBalance(chai.Assertion, chaiUtils);
  supportChangeEtherBalances(chai.Assertion, chaiUtils);
  supportChangeTokenBalance(chai.Assertion, chaiUtils);
  supportReverted(chai.Assertion, chaiUtils);
  supportRevertedWith(chai.Assertion, chaiUtils);
  supportRevertedWithCustomError(chai.Assertion, chaiUtils);
  supportRevertedWithPanic(chai.Assertion, chaiUtils);
  supportRevertedWithoutReason(chai.Assertion, chaiUtils);
  supportWithArgs(chai.Assertion, chaiUtils);
}
