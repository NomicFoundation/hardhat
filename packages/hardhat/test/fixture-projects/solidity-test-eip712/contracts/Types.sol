// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

enum Status {
  Pending,
  Settled
}

type Amount is uint128;

interface IToken {
  function transfer(address to, uint256 value) external returns (bool);
}

struct Person {
  string name;
  address wallet;
}

struct Asset {
  address token;
  uint256 amount;
}

// Two members of the same struct type, so a dependency named twice is still
// inlined once.
struct Mail {
  Person from;
  Person to;
  string contents;
}

// Dependencies that have to be sorted by name, not by rendered head.
struct Order {
  Asset give;
  Asset take;
  Person maker;
}

// Reaches `Person` only through `Mail`, so the transitive dependency has to be
// inlined too.
struct Envelope {
  Mail mail;
  uint256 nonce;
}

struct Batch {
  Asset[] assets;
}

// A fixed-size array and a nested one, whose suffixes are stripped to find the
// dependency and kept in the member's encoded type.
struct Grid {
  Asset[2] pair;
  uint256[3][] rows;
}

// A self-reference is not a dependency of itself.
struct Node {
  uint256 value;
  Node[] children;
}

// Every member whose EIP-712 encoding differs from its spelling: an enum, an
// interface, and a user-defined value type.
struct Receipt {
  Status status;
  IToken token;
  Amount amount;
  bytes32 digest;
  bytes payload;
  bool ok;
  int64 delta;
}
