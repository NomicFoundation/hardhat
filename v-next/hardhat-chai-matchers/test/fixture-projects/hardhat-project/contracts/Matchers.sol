// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.24;

contract Matchers {
  uint x;

  event SomeEvent();

  AnotherMatchersContract anotherContract;

  struct Pair {
    uint a;
    uint b;
  }

  error SomeCustomError();
  error AnotherCustomError();
  error CustomErrorWithInt(int);
  error CustomErrorWithUint(
    uint nameToForceEthersToUseAnArrayLikeWithNamedProperties
  );
  error CustomErrorWithUintAndString(uint, string);
  error CustomErrorWithPair(Pair);

  constructor() {
    anotherContract = new AnotherMatchersContract();
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

  function revertsWithoutReason() public {
    x++;
    require(false);
  }

  function revertsWithoutReasonView() public pure {
    require(false);
  }

  function panicAssert() public {
    x++;
    assert(false);
  }

  function panicAssertView() public pure {
    assert(false);
  }

  function revertWithSomeCustomError() public {
    x++;
    revert SomeCustomError();
  }

  function revertWithSomeCustomErrorView() public pure {
    revert SomeCustomError();
  }

  function revertWithAnotherCustomError() public {
    x++;
    revert AnotherCustomError();
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

  function revertWithCustomErrorWithUint(uint n) public {
    x++;
    revert CustomErrorWithUint(n);
  }

  function revertWithCustomErrorWithUintView(uint n) public pure {
    revert CustomErrorWithUint(n);
  }

  function revertWithCustomErrorWithInt(int i) public {
    x++;
    revert CustomErrorWithInt(i);
  }

  function revertWithCustomErrorWithIntView(int i) public pure {
    revert CustomErrorWithInt(i);
  }

  function revertWithCustomErrorWithUintAndString(
    uint n,
    string memory s
  ) public {
    x++;
    revert CustomErrorWithUintAndString(n, s);
  }

  function revertWithCustomErrorWithUintAndStringView(
    uint n,
    string memory s
  ) public pure {
    revert CustomErrorWithUintAndString(n, s);
  }

  function revertWithCustomErrorWithPair(uint a, uint b) public {
    x++;
    revert CustomErrorWithPair(Pair(a, b));
  }

  function revertWithCustomErrorWithPairView(uint a, uint b) public pure {
    revert CustomErrorWithPair(Pair(a, b));
  }
}

contract AnotherMatchersContract {
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
