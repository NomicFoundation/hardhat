contract Foo {}

contract Bar {}

contract UsesContract {
  address public contractAddress;

  constructor (address _contract) {
    contractAddress = _contract;
  }
}
