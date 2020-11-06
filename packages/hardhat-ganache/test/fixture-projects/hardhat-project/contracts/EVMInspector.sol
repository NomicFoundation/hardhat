pragma solidity ^0.7.4;

contract EVMConsumer {

    uint256 theChainID;

    constructor() public {
        uint256 id;
        assembly {
            id := chainid()
        }
        theChainID = id;
    }

}
