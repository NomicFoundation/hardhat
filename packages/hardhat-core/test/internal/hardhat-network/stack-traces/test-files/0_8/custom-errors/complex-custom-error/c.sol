pragma solidity ^0.8.4;

contract C {
  struct Point {
    uint x;
    uint y;
  }

  error MyError(uint x, uint[] xs, bytes4 b, Point p, Point[] ps);

  function test() public {
    uint x = 0;

    uint[] memory xs = new uint[](3);
    xs[0] = 1;
    xs[1] = 2;
    xs[2] = 3;

    bytes4 b = 0x12345678;

    Point memory p = Point(4, 5);

    Point[] memory ps = new Point[](2);
    ps[0] = Point(6,7);
    ps[1] = Point(8,9);

    revert MyError(x, xs, b, p, ps);
  }
}
