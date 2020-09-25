pragma solidity ^0.6.0;

contract D {
  enum E {
    YES,
    NO
  }
}

contract C is D {

  function test(E e) public {
    assert(e == E.YES);
  }

}
