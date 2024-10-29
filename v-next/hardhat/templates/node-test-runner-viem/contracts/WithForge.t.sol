import "forge-std/Test.sol";

contract TestContract is Test {
  ErrorsTest test;

  function setUp() public {
    test = new ErrorsTest();
  }

  function testExpectArithmetic() public {
    vm.expectRevert(stdError.arithmeticError);
    test.arithmeticError(10);
  }
}

contract ErrorsTest {
  function arithmeticError(uint256 a) public {
    uint256 a = a - 100;
  }
}
