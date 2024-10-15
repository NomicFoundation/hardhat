// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

abstract contract Abstract {
  function testPublic() public {}
  function testExternal() external {}
  function invariantPublic() public {}
  function invariantExternal() external {}
}

contract NoTest {}

contract PublicTest {
  function test() public {}
}

contract ExternalTest {
  function test() external {}
}

contract PrivateTest {
  function test() private {}
}

contract InternalTest {
  function test() internal {}
}

contract PublicInvariant {
  function invariant() public {}
}

contract ExternalInvariant {
  function invariant() external {}
}

contract PrivateInvariant {
  function invariant() private {}
}

contract InternalInvariant {
  function invariant() internal {}
}
