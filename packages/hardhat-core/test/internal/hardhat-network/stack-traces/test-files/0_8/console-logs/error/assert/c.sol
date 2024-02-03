pragma solidity ^0.8.0;

import "./../../../../../../../../console.sol";

contract C {

  function test(bool b) public {
    console.log("string1");
    assert(b);
  }

  // test2 is needed as workaround for the source mappings issue
  // with test2 solc is forced to generate different jumpdests
  // as a side effect proper source mappings are generated as well
  function test2() public {
    console.log("s");
  }
}
