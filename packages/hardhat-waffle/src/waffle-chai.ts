// This file only exists to workaround this: https://github.com/EthWorks/Waffle/issues/281

import path from "path";

/// <reference types="chai" />

export function waffleChai(chai: Chai.ChaiStatic, utils: Chai.ChaiUtils) {
  const wafflePath = require.resolve("ethereum-waffle");
  const waffleChaiPath = path.dirname(
    require.resolve("@ethereum-waffle/chai", {
      paths: [wafflePath],
    })
  );

  const { supportBigNumber } = require(`${waffleChaiPath}/matchers/bigNumber`);
  const {
    supportChangeBalance,
  } = require(`${waffleChaiPath}/matchers/changeBalance`);
  const {
    supportChangeBalances,
  } = require(`${waffleChaiPath}/matchers/changeBalances`);
  const {
    supportChangeEtherBalance,
  } = require(`${waffleChaiPath}/matchers/changeEtherBalance`);
  const {
    supportChangeEtherBalances,
  } = require(`${waffleChaiPath}/matchers/changeEtherBalances`);
  const {
    supportChangeTokenBalance,
  } = require(`${waffleChaiPath}/matchers/changeTokenBalance`);
  const {
    supportChangeTokenBalances,
  } = require(`${waffleChaiPath}/matchers/changeTokenBalances`);
  const { supportEmit } = require(`${waffleChaiPath}/matchers/emit`);
  const {
    supportProperAddress,
  } = require(`${waffleChaiPath}/matchers/properAddress`);
  const { supportProperHex } = require(`${waffleChaiPath}/matchers/properHex`);
  const {
    supportProperPrivateKey,
  } = require(`${waffleChaiPath}/matchers/properPrivateKey`);
  const { supportReverted } = require(`${waffleChaiPath}/matchers/reverted`);
  const {
    supportRevertedWith,
  } = require(`${waffleChaiPath}/matchers/revertedWith`);
  const { supportHexEqual } = require(`${waffleChaiPath}/matchers/hexEqual`);

  supportBigNumber(chai.Assertion, utils);
  supportReverted(chai.Assertion);
  supportRevertedWith(chai.Assertion);
  supportEmit(chai.Assertion);
  supportProperAddress(chai.Assertion);
  supportProperPrivateKey(chai.Assertion);
  supportProperHex(chai.Assertion);
  supportHexEqual(chai.Assertion);
  supportChangeBalance(chai.Assertion);
  supportChangeBalances(chai.Assertion);
  supportChangeEtherBalance(chai.Assertion);
  supportChangeEtherBalances(chai.Assertion);
  supportChangeTokenBalance(chai.Assertion);
  supportChangeTokenBalances(chai.Assertion);
  supportCalledOnContract(chai.Assertion);
  supportCalledOnContractWith(chai.Assertion);
}

function supportCalledOnContract(Assertion: Chai.AssertionStatic) {
  // eslint-disable-next-line import/no-extraneous-dependencies
  const Chai = require("chai");
  Assertion.addMethod("calledOnContract", function (_contract: any) {
    throw new Chai.AssertionError(
      "Waffle's calledOnContract is not supported by Hardhat"
    );
  });
}

function supportCalledOnContractWith(Assertion: Chai.AssertionStatic) {
  // eslint-disable-next-line import/no-extraneous-dependencies
  const Chai = require("chai");
  Assertion.addMethod("calledOnContractWith", function (_contract: any) {
    throw new Chai.AssertionError(
      "Waffle's calledOnContractWith is not supported by Hardhat"
    );
  });
}
