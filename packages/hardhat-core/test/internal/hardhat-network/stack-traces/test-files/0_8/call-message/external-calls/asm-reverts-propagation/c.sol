pragma solidity ^0.8.0;

contract A {
  uint counter;

  function a() external {
    counter++;
    revert("a reason");
  }
}

contract C {
  A a = new A();

  function test() external {
    (bool ok, bytes memory data) = address(a).call(bytes(hex"0dbe671f"));
    if (!ok) {
      assembly {
        revert(add(32, data), mload(data))
      }
    }
  }
}
