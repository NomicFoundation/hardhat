// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TokenWithoutNameNorSymbol {
  uint public decimals = 1;

  uint public totalSupply;
  mapping(address => uint) public balanceOf;
  mapping(address => mapping(address => uint)) allowances;

  constructor() {
    totalSupply = 1_000_000_000;
    balanceOf[msg.sender] = totalSupply;
  }

  function transfer(address to, uint value) public returns (bool) {
    require(value > 0, "Transferred value is zero");

    balanceOf[msg.sender] -= value;
    balanceOf[to] += value;

    return true;
  }

  function allowance(
    address owner,
    address spender
  ) public view returns (uint256 remaining) {
    return allowances[owner][spender];
  }

  function approve(
    address spender,
    uint256 value
  ) public returns (bool success) {
    allowances[msg.sender][spender] = value;
    return true;
  }

  function transferFrom(
    address from,
    address to,
    uint256 value
  ) public returns (bool) {
    require(allowance(from, msg.sender) >= value, "Insufficient allowance");

    allowances[from][msg.sender] -= value;
    balanceOf[from] -= value;
    balanceOf[to] += value;

    return true;
  }
}

contract TokenWithOnlyName is TokenWithoutNameNorSymbol {
  string public name = "MockToken";
}

contract MockToken is TokenWithoutNameNorSymbol {
  string public name = "MockToken";
  string public symbol = "MCK";
}

contract NotAToken {}
