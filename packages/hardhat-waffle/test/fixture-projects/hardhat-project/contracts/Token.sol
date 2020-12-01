// Example taken from https://gist.github.com/jonchurch/c71de291b3ffa49ae17e416393f87135 and modified
// Original code's license: BokkyPooBah 2017. The MIT Licence.

pragma solidity ^0.7.0;

contract Token {
  string public symbol = "FIXED";
  string public name = "Example Fixed Supply Token";
  uint8 public decimals = 18;
  uint256 _totalSupply = 1000000;

  event Transfer(address indexed _from, address indexed _to, uint256 _value);
  event Approval(
    address indexed _owner,
    address indexed _spender,
    uint256 _value
  );

  // Balances for each account
  mapping(address => uint256) balances;

  // Owner of account approves the transfer of an amount to another account
  mapping(address => mapping(address => uint256)) allowed;

  // Constructor
  constructor() {
    balances[msg.sender] = _totalSupply;
  }

  function totalSupply() public view returns (uint256) {
    return _totalSupply;
  }

  function balanceOf(address _owner) public view returns (uint256 balance) {
    return balances[_owner];
  }

  function transfer(address _to, uint256 _amount)
    public
    returns (bool success)
  {
    if (
      balances[msg.sender] >= _amount &&
      _amount > 0 &&
      balances[_to] + _amount > balances[_to]
    ) {
      balances[msg.sender] -= _amount;
      balances[_to] += _amount;
      emit Transfer(msg.sender, _to, _amount);
      return true;
    } else {
      return false;
    }
  }

  function transferFrom(
    address _from,
    address _to,
    uint256 _amount
  ) public returns (bool success) {
    if (
      balances[_from] >= _amount &&
      allowed[_from][msg.sender] >= _amount &&
      _amount > 0 &&
      balances[_to] + _amount > balances[_to]
    ) {
      balances[_from] -= _amount;
      allowed[_from][msg.sender] -= _amount;
      balances[_to] += _amount;
      emit Transfer(_from, _to, _amount);
      return true;
    } else {
      return false;
    }
  }

  function approve(address _spender, uint256 _amount)
    public
    returns (bool success)
  {
    allowed[msg.sender][_spender] = _amount;
    emit Approval(msg.sender, _spender, _amount);
    return true;
  }

  function allowance(address _owner, address _spender)
    public
    view
    returns (uint256 remaining)
  {
    return allowed[_owner][_spender];
  }
}
