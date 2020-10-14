pragma solidity ^0.5.0;

library TestLibrary {
    function libDo(uint256 n) external returns (uint256) {
        return n * 2;
    }
}

contract TestContractLib {

    function printNumber(uint256 amount) public returns (uint256) {
        uint result = TestLibrary.libDo(amount);
        return result;
    }
}
