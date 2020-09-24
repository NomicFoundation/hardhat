pragma solidity ^0.6.0;

contract D {

  function fail() public {
    r();
  }

  function r() internal {
    revert("D failed");
  }
}

contract C {

  function forward(address implementation) internal {
    assembly {
      calldatacopy(0, 0, calldatasize())
      let result := delegatecall(gas(), implementation, 0, calldatasize(), 0, 0)
      returndatacopy(0, 0, returndatasize())
      switch result
      case 0 { revert(0, returndatasize()) }
      default { return(0, returndatasize()) }
    }
  }

  fallback () external payable {
    D d = new D();
    forward(address(d));
  }

}
