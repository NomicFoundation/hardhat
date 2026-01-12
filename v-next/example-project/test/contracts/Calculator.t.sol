// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../contracts/Calculator.sol";
import "forge-std/Test.sol";

contract CalculatorTest is Test {
  Calculator calculator;

  function setUp() public {
    calculator = new Calculator();
  }

  // Unit Tests
  function testAddition() public {
    uint256 result = calculator.add(5, 3);
    assertEq(result, 8, "5 + 3 should equal 8");
    assertEq(calculator.result(), 8, "Result should be stored");
    assertEq(calculator.lastOperation(), 8, "Last operation should be stored");
  }

  function testSubtraction() public {
    uint256 result = calculator.subtract(10, 3);
    assertEq(result, 7, "10 - 3 should equal 7");
    assertEq(calculator.result(), 7, "Result should be stored");
  }

  function testSubtractionUnderflow() public {
    vm.expectRevert("Calculator: subtraction underflow");
    calculator.subtract(3, 10);
  }

  function testMultiplication() public {
    uint256 result = calculator.multiply(4, 5);
    assertEq(result, 20, "4 * 5 should equal 20");
    assertEq(calculator.result(), 20, "Result should be stored");
  }

  function testDivision() public {
    uint256 result = calculator.divide(20, 4);
    assertEq(result, 5, "20 / 4 should equal 5");
    assertEq(calculator.result(), 5, "Result should be stored");
  }

  function testDivisionByZero() public {
    vm.expectRevert("Calculator: division by zero");
    calculator.divide(10, 0);
  }

  function testReset() public {
    calculator.add(5, 3);
    calculator.reset();
    assertEq(calculator.result(), 0, "Result should be reset to 0");
    assertEq(
      calculator.lastOperation(),
      0,
      "Last operation should be reset to 0"
    );
  }

  // Fuzz Tests
  function testFuzzAddition(uint128 a, uint128 b) public {
    uint256 result = calculator.add(a, b);
    assertEq(result, uint256(a) + uint256(b), "Addition should be correct");
  }

  function testFuzzSubtraction(uint256 a, uint256 b) public {
    vm.assume(a >= b);
    uint256 result = calculator.subtract(a, b);
    assertEq(result, a - b, "Subtraction should be correct");
  }

  function testFuzzMultiplication(uint128 a, uint128 b) public {
    uint256 result = calculator.multiply(a, b);
    assertEq(
      result,
      uint256(a) * uint256(b),
      "Multiplication should be correct"
    );
  }

  function testFuzzDivision(uint256 a, uint256 b) public {
    vm.assume(b != 0);
    uint256 result = calculator.divide(a, b);
    assertEq(result, a / b, "Division should be correct");
  }

  // Invariant Tests
  function invariantResultMatchesLastOperation() public view {
    assertEq(
      calculator.result(),
      calculator.lastOperation(),
      "Result should always match last operation"
    );
  }

  function invariantResultIsFinite() public view {
    uint256 currentResult = calculator.result();
    assertTrue(
      currentResult <= type(uint256).max,
      "Result should never overflow uint256"
    );
  }

  // Gas Snapshot Tests
  function testSnapshotGasAddition() public {
    calculator.add(100, 200);
    vm.snapshotGasLastCall("calculator-add-single");
  }

  function testSnapshotGasSubtraction() public {
    calculator.subtract(1000, 500);
    vm.snapshotGasLastCall("calculator-subtract-single");
  }

  function testSnapshotGasMultiplication() public {
    calculator.multiply(25, 40);
    vm.snapshotGasLastCall("calculator-multiply-single");
  }

  function testSnapshotGasDivision() public {
    calculator.divide(1000, 10);
    vm.snapshotGasLastCall("calculator-divide-single");
  }

  function testSnapshotGasMultipleOperations() public {
    vm.startSnapshotGas("calculator-multiple-operations");
    calculator.add(10, 20);
    calculator.subtract(30, 5);
    calculator.multiply(5, 6);
    calculator.divide(100, 10);
    vm.stopSnapshotGas();
  }

  function testSnapshotGasSequentialOperations() public {
    vm.startSnapshotGas("gasRegion", "calculator-sequential-10-adds");
    for (uint i = 0; i < 10; i++) {
      calculator.add(i, i + 1);
    }
    vm.stopSnapshotGas();
  }

  function testSnapshotValues() public {
    uint256 initialResult = calculator.result();
    vm.snapshotValue("calculator-initial-result", initialResult);
    vm.snapshotValue("value", "calculator-initial-result", initialResult);

    calculator.add(100, 200);
    vm.snapshotValue("calculator-after-add", calculator.result());
    vm.snapshotValue("value", "calculator-after-add", calculator.result());

    calculator.multiply(2, 5);
    vm.snapshotValue("calculator-after-multiply", calculator.result());
    vm.snapshotValue("value", "calculator-after-multiply", calculator.result());

    calculator.divide(100, 5);
    vm.snapshotValue("calculator-after-divide", calculator.result());
    vm.snapshotValue("value", "calculator-after-divide", calculator.result());
  }

  function testSnapshotGasReset() public {
    calculator.add(100, 200);
    calculator.reset();
    vm.snapshotGasLastCall("gasLastCall", "calculator-reset");
  }
}
