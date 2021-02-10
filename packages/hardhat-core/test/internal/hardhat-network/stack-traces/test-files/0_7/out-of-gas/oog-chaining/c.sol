pragma solidity ^0.7.0;

// Note: This test is pretty special and also fragile.
// It check two kinds of OOGs "chaining":
//  * When an EVM message (M) OOGs, and the caller message also OOGs while checking if M OOG'd
//  * When an EVM message OOGs, and the caller reverts because of that
//
// The latter case leads to a CONTRACT_CALL_RUN_OUT_OF_GAS_ERROR, but the former just to a CALLSTACK_ENTRY.
// This test is very sensitive to the compiler being used, its settings, and the gas limit. It is known to work with
// soljson-v0.7.0+commit.9e61f92b.js, without optimizations, and 4M gas.
//
// The reason for it being so sensitive is that we can't test why CALLSTACK_ENTRYs were generated. 

contract O {
  uint i = 1;
  
  function inc() public {
      i += 1;
  }
  
  function oog() public {
    for (uint i = 0; i < 10000; i += 1) {
      this.inc();
    }
  }
}

contract C {

  function test() public {
    this.oog();
  }
  
  function oog() public {
    O o = new O();
    for (uint i = 0; i < 10000; i += 1) {
      o.oog();
    }
  }
}
