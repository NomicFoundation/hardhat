// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

abstract contract AbstractTest {
  function test_abstract() public pure {
    require(true, "abstract test should only run via concrete descendant");
  }
}

contract ConcreteFromAbstract is AbstractTest {
  function test_actual() public pure {
    require(true, "concrete test runs");
  }
}
