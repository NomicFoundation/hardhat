// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Test} from "forge-std/Test.sol";
import "../contracts/Proxies.sol";

contract CounterTest is Test {
  function test_ShouldTrackProxiedCallsToImpl1AndImpl2AsSeparate() public {
    Impl1 impl1 = new Impl1();
    Impl2 impl2 = new Impl2();

    Proxy proxy1 = new Proxy(address(impl1));
    Proxy proxy2 = new Proxy(address(impl2));

    Impl1 i1 = Impl1(address(proxy1));
    Impl2 i2 = Impl2(address(proxy2));

    emit log("Calling Proxy -> Impl1");
    i1.one();

    emit log("Calling Proxy -> Impl2");
    i2.two();

    emit log("Calling Impl1");
    impl1.one();
  }

  function test_ShouldTrackProxiedCallsToImpl1AsSeparateWithDifferentProxyChains()
    public
  {
    // We use the same impl but different proxy chains
    Impl1 impl1 = new Impl1();

    Proxy proxy1 = new Proxy(address(impl1));
    Proxy proxy2 = new Proxy(address(impl1));

    // We use a proxy in front of proxy1
    Proxy2 proxy11 = new Proxy2(address(impl1), address(proxy1));

    Impl1 i1 = Impl1(address(proxy11));
    Impl1 i2 = Impl1(address(proxy2));

    emit log("Calling Proxy2 -> Proxy -> Impl1");
    i1.one();

    emit log("Calling Proxy1 -> Impl1");
    i2.one();
  }
}
