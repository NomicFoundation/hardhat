contract Foo {
  bool public isFoo = true;
  uint public x = 1;

  function inc() public {
    x++;
  }

  function incByPositiveNumber(uint n) public {
    require(n > 0, "n must be positive");
    x += n;
  }
}

contract Bar {
  bool public isBar = true;
}

contract UsesContract {
  address public contractAddress;

  constructor (address _contract) {
    contractAddress = _contract;
  }
}
