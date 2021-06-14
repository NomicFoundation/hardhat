pragma solidity ^0.8.0;

contract C {
  enum MyEnum { Foo, Bar, Baz }

  function test() public {
    int x = -1;
    MyEnum myEnum = MyEnum(x);
  }
}
