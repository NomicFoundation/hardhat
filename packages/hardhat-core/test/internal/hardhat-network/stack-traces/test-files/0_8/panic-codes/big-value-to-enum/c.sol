pragma solidity ^0.8.0;

contract C {
  enum MyEnum { Foo, Bar, Baz }

  function test() public {
    uint x = 4;
    MyEnum myEnum = MyEnum(x);
  }
}
