import { use } from "chai";
import chaiAsPromised from "chai-as-promised";

import { supportAddressable } from "./matchers/addressable.js";
import { supportBigNumber } from "./matchers/big-number.js";
import { supportChangeEtherBalance } from "./matchers/changeEtherBalance.js";
import { supportChangeEtherBalances } from "./matchers/changeEtherBalances.js";
import { supportChangeTokenBalance } from "./matchers/changeTokenBalance.js";
import { supportEmit } from "./matchers/emit.js";
import { supportHexEqual } from "./matchers/hexEqual.js";
import { supportProperAddress } from "./matchers/properAddress.js";
import { supportProperHex } from "./matchers/properHex.js";
import { supportProperPrivateKey } from "./matchers/properPrivateKey.js";
import { supportRevert } from "./matchers/reverted/revert.js";
import { supportRevertedWith } from "./matchers/reverted/revertedWith.js";
import { supportRevertedWithCustomError } from "./matchers/reverted/revertedWithCustomError.js";
import { supportRevertedWithPanic } from "./matchers/reverted/revertedWithPanic.js";
import { supportRevertedWithoutReason } from "./matchers/reverted/revertedWithoutReason.js";
import { supportWithArgs } from "./matchers/withArgs.js";

export function addChaiMatchers(): void {
  use(hardhatChaiMatchers);
  use(chaiAsPromised);
}

function hardhatChaiMatchers(
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
  supportRevert(chai.Assertion, chaiUtils);
  supportRevertedWith(chai.Assertion, chaiUtils);
  supportRevertedWithCustomError(chai.Assertion, chaiUtils);
  supportRevertedWithPanic(chai.Assertion, chaiUtils);
  supportRevertedWithoutReason(chai.Assertion, chaiUtils);
  supportWithArgs(chai.Assertion, chaiUtils);
}
