// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Multisig {
  event Confirmation(address indexed sender, uint indexed transactionId);
  event Revocation(address indexed sender, uint indexed transactionId);
  event Submission(uint indexed transactionId);
  event Execution(uint indexed transactionId);
  event ExecutionFailure(uint indexed transactionId);
  event Deposit(address indexed sender, uint value);
  event OwnerAddition(address indexed owner);
  event OwnerRemoval(address indexed owner);
  event RequirementChange(uint required);

  uint public constant MAX_OWNER_COUNT = 50;

  mapping(uint => Transaction) public transactions;
  mapping(uint => mapping(address => bool)) public confirmations;
  mapping(address => bool) public isOwner;
  address[] public owners;
  uint public required;
  uint public transactionCount;

  struct Transaction {
    address destination;
    uint value;
    bytes data;
    bool executed;
  }

  modifier onlyWallet() {
    require(msg.sender == address(this));
    _;
  }

  modifier ownerDoesNotExist(address owner) {
    require(!isOwner[owner]);
    _;
  }

  modifier ownerExists(address owner) {
    require(isOwner[owner]);
    _;
  }

  modifier transactionExists(uint transactionId) {
    require(transactions[transactionId].destination != address(0));
    _;
  }

  modifier confirmed(uint transactionId, address owner) {
    require(confirmations[transactionId][owner]);
    _;
  }

  modifier notConfirmed(uint transactionId, address owner) {
    require(!confirmations[transactionId][owner]);
    _;
  }

  modifier notExecuted(uint transactionId) {
    require(!transactions[transactionId].executed);
    _;
  }

  modifier notNull(address _address) {
    require(_address != address(0));
    _;
  }

  modifier validRequirement(uint ownerCount, uint _required) {
    require(
      ownerCount <= MAX_OWNER_COUNT &&
        _required <= ownerCount &&
        _required != 0 &&
        ownerCount != 0
    );
    _;
  }

  receive() external payable {
    if (msg.value > 0) emit Deposit(msg.sender, msg.value);
  }

  constructor(
    address[] memory _owners,
    uint _required
  ) payable validRequirement(_owners.length, _required) {
    for (uint i = 0; i < _owners.length; i++) {
      require(!isOwner[_owners[i]] && _owners[i] != address(0));
      isOwner[_owners[i]] = true;
    }
    owners = _owners;
    required = _required;
  }

  function addOwner(
    address owner
  )
    public
    onlyWallet
    ownerDoesNotExist(owner)
    notNull(owner)
    validRequirement(owners.length + 1, required)
  {
    isOwner[owner] = true;
    owners.push(owner);
    emit OwnerAddition(owner);
  }

  function removeOwner(address owner) public onlyWallet ownerExists(owner) {
    isOwner[owner] = false;
    for (uint i = 0; i < owners.length - 1; i++)
      if (owners[i] == owner) {
        owners[i] = owners[owners.length - 1];
        break;
      }
    owners.pop();
    if (required > owners.length) changeRequirement(owners.length);
    emit OwnerRemoval(owner);
  }

  function replaceOwner(
    address owner,
    address newOwner
  ) public onlyWallet ownerExists(owner) ownerDoesNotExist(newOwner) {
    for (uint i = 0; i < owners.length; i++)
      if (owners[i] == owner) {
        owners[i] = newOwner;
        break;
      }
    isOwner[owner] = false;
    isOwner[newOwner] = true;
    emit OwnerRemoval(owner);
    emit OwnerAddition(newOwner);
  }

  function changeRequirement(
    uint _required
  ) public onlyWallet validRequirement(owners.length, _required) {
    required = _required;
    emit RequirementChange(_required);
  }

  function submitTransaction(
    address destination,
    uint value,
    bytes memory data
  ) public returns (uint transactionId) {
    transactionId = addTransaction(destination, value, data);
    confirmTransaction(transactionId);
  }

  function confirmTransaction(
    uint transactionId
  )
    public
    ownerExists(msg.sender)
    transactionExists(transactionId)
    notConfirmed(transactionId, msg.sender)
  {
    confirmations[transactionId][msg.sender] = true;
    emit Confirmation(msg.sender, transactionId);
  }

  function revokeConfirmation(
    uint transactionId
  )
    public
    ownerExists(msg.sender)
    confirmed(transactionId, msg.sender)
    notExecuted(transactionId)
  {
    confirmations[transactionId][msg.sender] = false;
    emit Revocation(msg.sender, transactionId);
  }

  function executeTransaction(
    uint transactionId
  )
    public
    ownerExists(msg.sender)
    confirmed(transactionId, msg.sender)
    notExecuted(transactionId)
  {
    if (isConfirmed(transactionId)) {
      Transaction storage txn = transactions[transactionId];
      txn.executed = true;
      if (external_call(txn.destination, txn.value, txn.data.length, txn.data))
        emit Execution(transactionId);
      else {
        emit ExecutionFailure(transactionId);
        txn.executed = false;
      }
    }
  }

  function external_call(
    address destination,
    uint value,
    uint dataLength,
    bytes memory data
  ) internal returns (bool) {
    bool result;
    assembly {
      let x := mload(0x40) // "Allocate" memory for output (0x40 is where "free memory" pointer is stored by convention)
      let d := add(data, 32) // First 32 bytes are the padded length of data, so exclude that
      result := call(
        sub(gas(), 34710), // 34710 is the value that solidity is currently emitting
        // It includes callGas (700) + callVeryLow (3, to pay for SUB) + callValueTransferGas (9000) +
        // callNewAccountGas (25000, in case the destination address does not exist and needs creating)
        destination,
        value,
        d,
        dataLength, // Size of the input (in bytes) - this is what fixes the padding problem
        x,
        0 // Output is ignored, therefore the output size is zero
      )
    }
    return result;
  }

  function isConfirmed(uint transactionId) public view returns (bool) {
    uint count = 0;
    for (uint i = 0; i < owners.length; i++) {
      if (confirmations[transactionId][owners[i]]) count += 1;
      if (count == required) return true;
    }

    return false;
  }

  function addTransaction(
    address destination,
    uint value,
    bytes memory data
  ) internal notNull(destination) returns (uint transactionId) {
    transactionId = transactionCount;
    transactions[transactionId] = Transaction({
      destination: destination,
      value: value,
      data: data,
      executed: false
    });
    transactionCount += 1;
    emit Submission(transactionId);
  }

  function getConfirmationCount(
    uint transactionId
  ) public view returns (uint count) {
    for (uint i = 0; i < owners.length; i++)
      if (confirmations[transactionId][owners[i]]) count += 1;
  }

  function getTransactionCount(
    bool pending,
    bool executed
  ) public view returns (uint count) {
    for (uint i = 0; i < transactionCount; i++)
      if (
        (pending && !transactions[i].executed) ||
        (executed && transactions[i].executed)
      ) count += 1;
  }

  function getOwners() public view returns (address[] memory) {
    return owners;
  }

  function getConfirmations(
    uint transactionId
  ) public view returns (address[] memory _confirmations) {
    address[] memory confirmationsTemp = new address[](owners.length);
    uint count = 0;
    uint i;
    for (i = 0; i < owners.length; i++)
      if (confirmations[transactionId][owners[i]]) {
        confirmationsTemp[count] = owners[i];
        count += 1;
      }
    _confirmations = new address[](count);
    for (i = 0; i < count; i++) _confirmations[i] = confirmationsTemp[i];
  }

  function getTransactionIds(
    uint from,
    uint to,
    bool pending,
    bool executed
  ) public view returns (uint[] memory _transactionIds) {
    uint[] memory transactionIdsTemp = new uint[](transactionCount);
    uint count = 0;
    uint i;
    for (i = 0; i < transactionCount; i++)
      if (
        (pending && !transactions[i].executed) ||
        (executed && transactions[i].executed)
      ) {
        transactionIdsTemp[count] = i;
        count += 1;
      }
    _transactionIds = new uint[](to - from);
    for (i = from; i < to; i++)
      _transactionIds[i - from] = transactionIdsTemp[i];
  }
}
