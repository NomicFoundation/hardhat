pragma solidity ^0.4.0;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/token/ERC20/StandardToken.sol';
import './Contract2.sol';

// This contract is used as an example to create a model of it in TS, look at src-ts/Contract.ts
contract Contract {

    event EventA();

    event EventB(uint8 a, string b);

    event EventC(uint256 indexed a, uint256 indexed b);

    event EventD(uint256 a, uint256 indexed b);

    event EventE(uint256 indexed a, uint256 b);

    uint256 public asd;

    function Contract() public payable {
        asd = msg.value;
    }

    function c(Ownable o) public constant returns (uint256) {
        asd;
    }

    function v() public pure returns (uint256) {
        return 123;
    }

    function p() public view returns (uint256, bool) {
        return (asd, false);
    }

    function named() public view returns (uint256 n, bool b) {
        return (12345, false);
    }

    function publicNonPayable() public {
        asd = 123;
    }

    function publicPayable() public payable {
        asd = msg.value;
    }

}
