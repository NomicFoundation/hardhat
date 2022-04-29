// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

contract Matchers {
  uint x;

  AnotherContract anotherContract;

  error SomeCustomError();
  error AnotherCustomError();

  constructor () {
    anotherContract = new AnotherContract();
  }

  function succeeds() public {
    x++; // just to avoid compiler warnings
  }

  function succeedsView() public view returns (uint) {
    return x;
  }

  function revertsWith(string memory reason) public {
    x++;
    require(false, reason);
  }

  function revertsWithView(string memory reason) public pure {
    require(false, reason);
  }

  function revertsWithoutReasonString() public {
    x++;
    require(false);
  }

  function revertsWithoutReasonStringView() public pure {
    require(false);
  }

  function panicAssert() public {
    x++;
    assert(false);
  }

  function panicAssertView() public {
    x++;
    assert(false);
  }

  function panicUnderflow(uint n) public {
    n--;
    x++;
  }

  function panicUnderflowView(uint n) public pure {
    n--;
  }

  function revertWithSomeCustomError() public {
    x++;
    revert SomeCustomError();
  }

  function revertWithSomeCustomErrorView() public pure {
    revert SomeCustomError();
  }

  function revertWithAnotherCustomErrorView() public pure {
    revert AnotherCustomError();
  }

  function revertWithAnotherContractCustomError() public {
    x++;
    anotherContract.revertWithYetAnotherCustomError();
  }

  function revertWithAnotherContractCustomErrorView() public view {
    anotherContract.revertWithYetAnotherCustomErrorView();
  }
}

contract AnotherContract {
  uint x;

  error YetAnotherCustomError();

  function revertWithYetAnotherCustomError() public {
    x++;
    revert YetAnotherCustomError();
  }

  function revertWithYetAnotherCustomErrorView() public pure {
    revert YetAnotherCustomError();
  }
}
