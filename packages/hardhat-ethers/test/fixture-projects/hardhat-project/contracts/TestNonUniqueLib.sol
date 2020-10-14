pragma solidity ^0.5.0;

library NonUniqueLibrary {
    function libDo(uint256 n) external returns (uint256) {
        return n * 2;
    }
}

contract TestNonUniqueLib {

    function printNumber(uint256 amount) public returns (uint256) {
        uint result = NonUniqueLibrary.libDo(amount);
        return result;
    }
}
