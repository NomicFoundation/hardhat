// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Eip712Test} from "./Eip712Test.sol";
import {Holder, IHolder} from "../contracts/Nested.sol";

contract NestedStructsTest is Eip712Test {
  function test_collectsAStructDeclaredInsideAContract() public pure {
    assertTypeHash("Inner", "Inner(uint256 x)");
  }

  function test_collectsAStructDeclaredInsideAnInterface() public pure {
    assertTypeHash("Outer", "Outer(Inner inner,bool flag)Inner(uint256 x)");
  }
}
