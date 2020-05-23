pragma solidity ^0.6.0;

import "./d.sol";

contract C is D, E {
    constructor(bool b) D(b) E(b) public {}

}
