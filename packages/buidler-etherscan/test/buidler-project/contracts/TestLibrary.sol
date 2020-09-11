pragma solidity ^0.5.15;

library TestLibrary {
    function libDo(uint256 n) external returns (uint256) {
        return n * 2;
    }

    function libID() external returns (string memory) {
        return "placeholder";
    }
}
