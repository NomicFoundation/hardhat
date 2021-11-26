pragma solidity ^0.8.0;


contract C {

  enum E {
    A,
    B
  }

  mapping(E => uint) public a;

  constructor() public {
  }

}
