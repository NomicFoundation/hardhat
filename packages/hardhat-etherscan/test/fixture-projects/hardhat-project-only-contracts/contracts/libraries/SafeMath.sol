pragma solidity 0.5.15;


library SafeMath {

    function mul(uint256 num1, uint256 num2) public pure returns (uint256) {
        uint256 result = num1 * num2;
        return result;
    }


    function div(uint256 num1, uint256 num2) public pure returns (uint256) {
        uint256 result = num1 / num2;
        return result;
    }


    function sub(uint256 num1, uint256 num2) public pure returns (uint256) {
        uint256 result = num1 - num2;
        return result;
    }


    function add(uint256 num1, uint256 num2) public pure returns (uint256) {
        uint256 result = num1 + num2;
        return result;
    }
}
