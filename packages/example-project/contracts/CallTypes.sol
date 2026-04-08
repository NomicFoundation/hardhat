// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";

/// @notice Demonstrates different EVM call types for trace output testing.
/// Used by scripts/demo-call-types.ts to exercise [CALL], [CREATE],
/// [STATICCALL], [DELEGATECALL], and [EVENT] trace tags.

/// @notice Helper contract with view and write functions
contract Logic {
  event ValueSet(address indexed setter, uint256 value);

  uint256 public value;

  function setValue(uint256 _value) external {
    console.log("Logic.setValue:", _value);
    value = _value;
    emit ValueSet(msg.sender, _value);
  }

  function getValue() external view returns (uint256) {
    return value;
  }

  function pureAdd(uint256 a, uint256 b) external pure returns (uint256) {
    return a + b;
  }

  function mustBePositive(uint256 _value) external {
    require(_value > 0, "Value must be positive");
    console.log("Logic.mustBePositive:", _value);
    value = _value;
    emit ValueSet(msg.sender, _value);
  }
}

/// @notice Orchestrator that calls Logic, exercising multiple call types
contract Orchestrator {
  event Orchestrated(uint256 result);

  Logic public logic;

  constructor(Logic _logic) {
    logic = _logic;
  }

  /// @notice Regular external CALL to Logic.setValue
  function doCall(uint256 _value) external {
    logic.setValue(_value);
  }

  /// @notice Calls Logic.mustBePositive — reverts when _value == 0
  function doCallThatReverts(uint256 _value) external {
    logic.mustBePositive(_value);
  }

  /// @notice External view call to Logic → produces STATICCALL
  function doStaticCall() external view returns (uint256) {
    return logic.getValue();
  }

  /// @notice Explicit delegatecall to Logic.setValue → produces DELEGATECALL trace
  function doDelegateCall(uint256 _value) external returns (bool success) {
    bytes memory data = abi.encodeWithSelector(Logic.setValue.selector, _value);
    (success, ) = address(logic).delegatecall(data);
  }

  /// @notice Mixed: DELEGATECALL + CALL (Logic.setValue) + STATICCALL (Logic.getValue)
  function doAllCallTypes(uint256 a, uint256 b) external returns (uint256) {
    // DELEGATECALL to Logic.pureAdd (uses pureAdd to avoid storage collision)
    bytes memory data = abi.encodeWithSelector(Logic.pureAdd.selector, a, b);
    address(logic).delegatecall(data);
    // CALL to Logic.setValue
    logic.setValue(a + b);
    // STATICCALL to Logic.getValue
    uint256 readBack = logic.getValue();
    emit Orchestrated(readBack);
    return readBack;
  }
}

/// @notice Factory that creates contracts in a single transaction
contract CallTypesFactory {
  event ContractsDeployed(address indexed logic, address indexed orchestrator);

  function deploy() external returns (address, address) {
    Logic logicContract = new Logic();
    Orchestrator orch = new Orchestrator(logicContract);
    emit ContractsDeployed(address(logicContract), address(orch));
    return (address(logicContract), address(orch));
  }
}
