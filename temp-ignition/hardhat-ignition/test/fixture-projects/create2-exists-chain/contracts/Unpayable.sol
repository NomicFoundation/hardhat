// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;
pragma experimental ABIEncoderV2;

contract Unpayable {
  bool public isUnpayable = true;

  // intentionally not payable
  constructor() {}
}
