pragma solidity >=0.4.11 <0.6.0;

library console {
	struct WrappedBytes {
		bytes b;
	}

	struct WrappedBytes32 {
		bytes32 b;
	}

	struct WrappedInt {
		int i;
	}

	function asHex(bytes memory p0) internal pure returns (WrappedBytes memory) {
		return WrappedBytes({
			b: p0
		});
	}

	function asHex(bytes32 p0) internal pure returns (WrappedBytes32 memory) {
		return WrappedBytes32({
			b: p0
		});
	}

	function asInt(int256 p0) internal pure returns (WrappedInt memory) {
		return WrappedInt({
			i: p0
		});
	}

	function log(uint256 p0) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256)", p0));
		ignored;
	}

	function log(WrappedInt memory p0) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256))", p0.i));
		ignored;
	}

	function log(string memory p0) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string)", p0));
		ignored;
	}

	function log(bool p0) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool)", p0));
		ignored;
	}

	function log(address p0) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address)", p0));
		ignored;
	}

	function log(WrappedBytes memory p0) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes))", p0.b));
		ignored;
	}

	function log(WrappedBytes32 memory p0) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32))", p0.b));
		ignored;
	}

	function log(uint256 p0, uint256 p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,uint256)", p0, p1));
		ignored;
	}

	function log(uint256 p0, WrappedInt memory p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,(int256))", p0, p1.i));
		ignored;
	}

	function log(uint256 p0, string memory p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,string)", p0, p1));
		ignored;
	}

	function log(uint256 p0, bool p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,bool)", p0, p1));
		ignored;
	}

	function log(uint256 p0, address p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,address)", p0, p1));
		ignored;
	}

	function log(uint256 p0, WrappedBytes memory p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,(bytes))", p0, p1.b));
		ignored;
	}

	function log(uint256 p0, WrappedBytes32 memory p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,(bytes32))", p0, p1.b));
		ignored;
	}

	function log(WrappedInt memory p0, uint256 p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),uint256)", p0.i, p1));
		ignored;
	}

	function log(WrappedInt memory p0, WrappedInt memory p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),(int256))", p0.i, p1.i));
		ignored;
	}

	function log(WrappedInt memory p0, string memory p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),string)", p0.i, p1));
		ignored;
	}

	function log(WrappedInt memory p0, bool p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),bool)", p0.i, p1));
		ignored;
	}

	function log(WrappedInt memory p0, address p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),address)", p0.i, p1));
		ignored;
	}

	function log(WrappedInt memory p0, WrappedBytes memory p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),(bytes))", p0.i, p1.b));
		ignored;
	}

	function log(WrappedInt memory p0, WrappedBytes32 memory p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),(bytes32))", p0.i, p1.b));
		ignored;
	}

	function log(string memory p0, uint256 p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,uint256)", p0, p1));
		ignored;
	}

	function log(string memory p0, WrappedInt memory p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,(int256))", p0, p1.i));
		ignored;
	}

	function log(string memory p0, string memory p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,string)", p0, p1));
		ignored;
	}

	function log(string memory p0, bool p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,bool)", p0, p1));
		ignored;
	}

	function log(string memory p0, address p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,address)", p0, p1));
		ignored;
	}

	function log(string memory p0, WrappedBytes memory p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,(bytes))", p0, p1.b));
		ignored;
	}

	function log(string memory p0, WrappedBytes32 memory p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,(bytes32))", p0, p1.b));
		ignored;
	}

	function log(bool p0, uint256 p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,uint256)", p0, p1));
		ignored;
	}

	function log(bool p0, WrappedInt memory p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,(int256))", p0, p1.i));
		ignored;
	}

	function log(bool p0, string memory p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,string)", p0, p1));
		ignored;
	}

	function log(bool p0, bool p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,bool)", p0, p1));
		ignored;
	}

	function log(bool p0, address p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,address)", p0, p1));
		ignored;
	}

	function log(bool p0, WrappedBytes memory p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,(bytes))", p0, p1.b));
		ignored;
	}

	function log(bool p0, WrappedBytes32 memory p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,(bytes32))", p0, p1.b));
		ignored;
	}

	function log(address p0, uint256 p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,uint256)", p0, p1));
		ignored;
	}

	function log(address p0, WrappedInt memory p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,(int256))", p0, p1.i));
		ignored;
	}

	function log(address p0, string memory p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,string)", p0, p1));
		ignored;
	}

	function log(address p0, bool p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,bool)", p0, p1));
		ignored;
	}

	function log(address p0, address p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,address)", p0, p1));
		ignored;
	}

	function log(address p0, WrappedBytes memory p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,(bytes))", p0, p1.b));
		ignored;
	}

	function log(address p0, WrappedBytes32 memory p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,(bytes32))", p0, p1.b));
		ignored;
	}

	function log(WrappedBytes memory p0, uint256 p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),uint256)", p0.b, p1));
		ignored;
	}

	function log(WrappedBytes memory p0, WrappedInt memory p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),(int256))", p0.b, p1.i));
		ignored;
	}

	function log(WrappedBytes memory p0, string memory p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),string)", p0.b, p1));
		ignored;
	}

	function log(WrappedBytes memory p0, bool p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),bool)", p0.b, p1));
		ignored;
	}

	function log(WrappedBytes memory p0, address p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),address)", p0.b, p1));
		ignored;
	}

	function log(WrappedBytes memory p0, WrappedBytes memory p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),(bytes))", p0.b, p1.b));
		ignored;
	}

	function log(WrappedBytes memory p0, WrappedBytes32 memory p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),(bytes32))", p0.b, p1.b));
		ignored;
	}

	function log(WrappedBytes32 memory p0, uint256 p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),uint256)", p0.b, p1));
		ignored;
	}

	function log(WrappedBytes32 memory p0, WrappedInt memory p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),(int256))", p0.b, p1.i));
		ignored;
	}

	function log(WrappedBytes32 memory p0, string memory p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),string)", p0.b, p1));
		ignored;
	}

	function log(WrappedBytes32 memory p0, bool p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),bool)", p0.b, p1));
		ignored;
	}

	function log(WrappedBytes32 memory p0, address p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),address)", p0.b, p1));
		ignored;
	}

	function log(WrappedBytes32 memory p0, WrappedBytes memory p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),(bytes))", p0.b, p1.b));
		ignored;
	}

	function log(WrappedBytes32 memory p0, WrappedBytes32 memory p1) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),(bytes32))", p0.b, p1.b));
		ignored;
	}

	function log(uint256 p0, uint256 p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,uint256,uint256)", p0, p1, p2));
		ignored;
	}

	function log(uint256 p0, uint256 p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,uint256,(int256))", p0, p1, p2.i));
		ignored;
	}

	function log(uint256 p0, uint256 p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,uint256,string)", p0, p1, p2));
		ignored;
	}

	function log(uint256 p0, uint256 p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,uint256,bool)", p0, p1, p2));
		ignored;
	}

	function log(uint256 p0, uint256 p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,uint256,address)", p0, p1, p2));
		ignored;
	}

	function log(uint256 p0, uint256 p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,uint256,(bytes))", p0, p1, p2.b));
		ignored;
	}

	function log(uint256 p0, uint256 p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,uint256,(bytes32))", p0, p1, p2.b));
		ignored;
	}

	function log(uint256 p0, WrappedInt memory p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,(int256),uint256)", p0, p1.i, p2));
		ignored;
	}

	function log(uint256 p0, WrappedInt memory p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,(int256),(int256))", p0, p1.i, p2.i));
		ignored;
	}

	function log(uint256 p0, WrappedInt memory p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,(int256),string)", p0, p1.i, p2));
		ignored;
	}

	function log(uint256 p0, WrappedInt memory p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,(int256),bool)", p0, p1.i, p2));
		ignored;
	}

	function log(uint256 p0, WrappedInt memory p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,(int256),address)", p0, p1.i, p2));
		ignored;
	}

	function log(uint256 p0, WrappedInt memory p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,(int256),(bytes))", p0, p1.i, p2.b));
		ignored;
	}

	function log(uint256 p0, WrappedInt memory p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,(int256),(bytes32))", p0, p1.i, p2.b));
		ignored;
	}

	function log(uint256 p0, string memory p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,string,uint256)", p0, p1, p2));
		ignored;
	}

	function log(uint256 p0, string memory p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,string,(int256))", p0, p1, p2.i));
		ignored;
	}

	function log(uint256 p0, string memory p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,string,string)", p0, p1, p2));
		ignored;
	}

	function log(uint256 p0, string memory p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,string,bool)", p0, p1, p2));
		ignored;
	}

	function log(uint256 p0, string memory p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,string,address)", p0, p1, p2));
		ignored;
	}

	function log(uint256 p0, string memory p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,string,(bytes))", p0, p1, p2.b));
		ignored;
	}

	function log(uint256 p0, string memory p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,string,(bytes32))", p0, p1, p2.b));
		ignored;
	}

	function log(uint256 p0, bool p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,bool,uint256)", p0, p1, p2));
		ignored;
	}

	function log(uint256 p0, bool p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,bool,(int256))", p0, p1, p2.i));
		ignored;
	}

	function log(uint256 p0, bool p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,bool,string)", p0, p1, p2));
		ignored;
	}

	function log(uint256 p0, bool p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,bool,bool)", p0, p1, p2));
		ignored;
	}

	function log(uint256 p0, bool p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,bool,address)", p0, p1, p2));
		ignored;
	}

	function log(uint256 p0, bool p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,bool,(bytes))", p0, p1, p2.b));
		ignored;
	}

	function log(uint256 p0, bool p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,bool,(bytes32))", p0, p1, p2.b));
		ignored;
	}

	function log(uint256 p0, address p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,address,uint256)", p0, p1, p2));
		ignored;
	}

	function log(uint256 p0, address p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,address,(int256))", p0, p1, p2.i));
		ignored;
	}

	function log(uint256 p0, address p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,address,string)", p0, p1, p2));
		ignored;
	}

	function log(uint256 p0, address p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,address,bool)", p0, p1, p2));
		ignored;
	}

	function log(uint256 p0, address p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,address,address)", p0, p1, p2));
		ignored;
	}

	function log(uint256 p0, address p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,address,(bytes))", p0, p1, p2.b));
		ignored;
	}

	function log(uint256 p0, address p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,address,(bytes32))", p0, p1, p2.b));
		ignored;
	}

	function log(uint256 p0, WrappedBytes memory p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,(bytes),uint256)", p0, p1.b, p2));
		ignored;
	}

	function log(uint256 p0, WrappedBytes memory p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,(bytes),(int256))", p0, p1.b, p2.i));
		ignored;
	}

	function log(uint256 p0, WrappedBytes memory p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,(bytes),string)", p0, p1.b, p2));
		ignored;
	}

	function log(uint256 p0, WrappedBytes memory p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,(bytes),bool)", p0, p1.b, p2));
		ignored;
	}

	function log(uint256 p0, WrappedBytes memory p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,(bytes),address)", p0, p1.b, p2));
		ignored;
	}

	function log(uint256 p0, WrappedBytes memory p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,(bytes),(bytes))", p0, p1.b, p2.b));
		ignored;
	}

	function log(uint256 p0, WrappedBytes memory p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,(bytes),(bytes32))", p0, p1.b, p2.b));
		ignored;
	}

	function log(uint256 p0, WrappedBytes32 memory p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,(bytes32),uint256)", p0, p1.b, p2));
		ignored;
	}

	function log(uint256 p0, WrappedBytes32 memory p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,(bytes32),(int256))", p0, p1.b, p2.i));
		ignored;
	}

	function log(uint256 p0, WrappedBytes32 memory p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,(bytes32),string)", p0, p1.b, p2));
		ignored;
	}

	function log(uint256 p0, WrappedBytes32 memory p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,(bytes32),bool)", p0, p1.b, p2));
		ignored;
	}

	function log(uint256 p0, WrappedBytes32 memory p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,(bytes32),address)", p0, p1.b, p2));
		ignored;
	}

	function log(uint256 p0, WrappedBytes32 memory p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,(bytes32),(bytes))", p0, p1.b, p2.b));
		ignored;
	}

	function log(uint256 p0, WrappedBytes32 memory p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(uint256,(bytes32),(bytes32))", p0, p1.b, p2.b));
		ignored;
	}

	function log(WrappedInt memory p0, uint256 p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),uint256,uint256)", p0.i, p1, p2));
		ignored;
	}

	function log(WrappedInt memory p0, uint256 p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),uint256,(int256))", p0.i, p1, p2.i));
		ignored;
	}

	function log(WrappedInt memory p0, uint256 p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),uint256,string)", p0.i, p1, p2));
		ignored;
	}

	function log(WrappedInt memory p0, uint256 p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),uint256,bool)", p0.i, p1, p2));
		ignored;
	}

	function log(WrappedInt memory p0, uint256 p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),uint256,address)", p0.i, p1, p2));
		ignored;
	}

	function log(WrappedInt memory p0, uint256 p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),uint256,(bytes))", p0.i, p1, p2.b));
		ignored;
	}

	function log(WrappedInt memory p0, uint256 p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),uint256,(bytes32))", p0.i, p1, p2.b));
		ignored;
	}

	function log(WrappedInt memory p0, WrappedInt memory p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),(int256),uint256)", p0.i, p1.i, p2));
		ignored;
	}

	function log(WrappedInt memory p0, WrappedInt memory p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),(int256),(int256))", p0.i, p1.i, p2.i));
		ignored;
	}

	function log(WrappedInt memory p0, WrappedInt memory p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),(int256),string)", p0.i, p1.i, p2));
		ignored;
	}

	function log(WrappedInt memory p0, WrappedInt memory p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),(int256),bool)", p0.i, p1.i, p2));
		ignored;
	}

	function log(WrappedInt memory p0, WrappedInt memory p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),(int256),address)", p0.i, p1.i, p2));
		ignored;
	}

	function log(WrappedInt memory p0, WrappedInt memory p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),(int256),(bytes))", p0.i, p1.i, p2.b));
		ignored;
	}

	function log(WrappedInt memory p0, WrappedInt memory p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),(int256),(bytes32))", p0.i, p1.i, p2.b));
		ignored;
	}

	function log(WrappedInt memory p0, string memory p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),string,uint256)", p0.i, p1, p2));
		ignored;
	}

	function log(WrappedInt memory p0, string memory p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),string,(int256))", p0.i, p1, p2.i));
		ignored;
	}

	function log(WrappedInt memory p0, string memory p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),string,string)", p0.i, p1, p2));
		ignored;
	}

	function log(WrappedInt memory p0, string memory p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),string,bool)", p0.i, p1, p2));
		ignored;
	}

	function log(WrappedInt memory p0, string memory p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),string,address)", p0.i, p1, p2));
		ignored;
	}

	function log(WrappedInt memory p0, string memory p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),string,(bytes))", p0.i, p1, p2.b));
		ignored;
	}

	function log(WrappedInt memory p0, string memory p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),string,(bytes32))", p0.i, p1, p2.b));
		ignored;
	}

	function log(WrappedInt memory p0, bool p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),bool,uint256)", p0.i, p1, p2));
		ignored;
	}

	function log(WrappedInt memory p0, bool p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),bool,(int256))", p0.i, p1, p2.i));
		ignored;
	}

	function log(WrappedInt memory p0, bool p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),bool,string)", p0.i, p1, p2));
		ignored;
	}

	function log(WrappedInt memory p0, bool p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),bool,bool)", p0.i, p1, p2));
		ignored;
	}

	function log(WrappedInt memory p0, bool p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),bool,address)", p0.i, p1, p2));
		ignored;
	}

	function log(WrappedInt memory p0, bool p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),bool,(bytes))", p0.i, p1, p2.b));
		ignored;
	}

	function log(WrappedInt memory p0, bool p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),bool,(bytes32))", p0.i, p1, p2.b));
		ignored;
	}

	function log(WrappedInt memory p0, address p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),address,uint256)", p0.i, p1, p2));
		ignored;
	}

	function log(WrappedInt memory p0, address p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),address,(int256))", p0.i, p1, p2.i));
		ignored;
	}

	function log(WrappedInt memory p0, address p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),address,string)", p0.i, p1, p2));
		ignored;
	}

	function log(WrappedInt memory p0, address p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),address,bool)", p0.i, p1, p2));
		ignored;
	}

	function log(WrappedInt memory p0, address p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),address,address)", p0.i, p1, p2));
		ignored;
	}

	function log(WrappedInt memory p0, address p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),address,(bytes))", p0.i, p1, p2.b));
		ignored;
	}

	function log(WrappedInt memory p0, address p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),address,(bytes32))", p0.i, p1, p2.b));
		ignored;
	}

	function log(WrappedInt memory p0, WrappedBytes memory p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),(bytes),uint256)", p0.i, p1.b, p2));
		ignored;
	}

	function log(WrappedInt memory p0, WrappedBytes memory p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),(bytes),(int256))", p0.i, p1.b, p2.i));
		ignored;
	}

	function log(WrappedInt memory p0, WrappedBytes memory p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),(bytes),string)", p0.i, p1.b, p2));
		ignored;
	}

	function log(WrappedInt memory p0, WrappedBytes memory p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),(bytes),bool)", p0.i, p1.b, p2));
		ignored;
	}

	function log(WrappedInt memory p0, WrappedBytes memory p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),(bytes),address)", p0.i, p1.b, p2));
		ignored;
	}

	function log(WrappedInt memory p0, WrappedBytes memory p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),(bytes),(bytes))", p0.i, p1.b, p2.b));
		ignored;
	}

	function log(WrappedInt memory p0, WrappedBytes memory p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),(bytes),(bytes32))", p0.i, p1.b, p2.b));
		ignored;
	}

	function log(WrappedInt memory p0, WrappedBytes32 memory p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),(bytes32),uint256)", p0.i, p1.b, p2));
		ignored;
	}

	function log(WrappedInt memory p0, WrappedBytes32 memory p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),(bytes32),(int256))", p0.i, p1.b, p2.i));
		ignored;
	}

	function log(WrappedInt memory p0, WrappedBytes32 memory p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),(bytes32),string)", p0.i, p1.b, p2));
		ignored;
	}

	function log(WrappedInt memory p0, WrappedBytes32 memory p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),(bytes32),bool)", p0.i, p1.b, p2));
		ignored;
	}

	function log(WrappedInt memory p0, WrappedBytes32 memory p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),(bytes32),address)", p0.i, p1.b, p2));
		ignored;
	}

	function log(WrappedInt memory p0, WrappedBytes32 memory p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),(bytes32),(bytes))", p0.i, p1.b, p2.b));
		ignored;
	}

	function log(WrappedInt memory p0, WrappedBytes32 memory p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((int256),(bytes32),(bytes32))", p0.i, p1.b, p2.b));
		ignored;
	}

	function log(string memory p0, uint256 p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,uint256,uint256)", p0, p1, p2));
		ignored;
	}

	function log(string memory p0, uint256 p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,uint256,(int256))", p0, p1, p2.i));
		ignored;
	}

	function log(string memory p0, uint256 p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,uint256,string)", p0, p1, p2));
		ignored;
	}

	function log(string memory p0, uint256 p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,uint256,bool)", p0, p1, p2));
		ignored;
	}

	function log(string memory p0, uint256 p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,uint256,address)", p0, p1, p2));
		ignored;
	}

	function log(string memory p0, uint256 p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,uint256,(bytes))", p0, p1, p2.b));
		ignored;
	}

	function log(string memory p0, uint256 p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,uint256,(bytes32))", p0, p1, p2.b));
		ignored;
	}

	function log(string memory p0, WrappedInt memory p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,(int256),uint256)", p0, p1.i, p2));
		ignored;
	}

	function log(string memory p0, WrappedInt memory p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,(int256),(int256))", p0, p1.i, p2.i));
		ignored;
	}

	function log(string memory p0, WrappedInt memory p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,(int256),string)", p0, p1.i, p2));
		ignored;
	}

	function log(string memory p0, WrappedInt memory p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,(int256),bool)", p0, p1.i, p2));
		ignored;
	}

	function log(string memory p0, WrappedInt memory p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,(int256),address)", p0, p1.i, p2));
		ignored;
	}

	function log(string memory p0, WrappedInt memory p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,(int256),(bytes))", p0, p1.i, p2.b));
		ignored;
	}

	function log(string memory p0, WrappedInt memory p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,(int256),(bytes32))", p0, p1.i, p2.b));
		ignored;
	}

	function log(string memory p0, string memory p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,string,uint256)", p0, p1, p2));
		ignored;
	}

	function log(string memory p0, string memory p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,string,(int256))", p0, p1, p2.i));
		ignored;
	}

	function log(string memory p0, string memory p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,string,string)", p0, p1, p2));
		ignored;
	}

	function log(string memory p0, string memory p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,string,bool)", p0, p1, p2));
		ignored;
	}

	function log(string memory p0, string memory p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,string,address)", p0, p1, p2));
		ignored;
	}

	function log(string memory p0, string memory p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,string,(bytes))", p0, p1, p2.b));
		ignored;
	}

	function log(string memory p0, string memory p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,string,(bytes32))", p0, p1, p2.b));
		ignored;
	}

	function log(string memory p0, bool p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,bool,uint256)", p0, p1, p2));
		ignored;
	}

	function log(string memory p0, bool p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,bool,(int256))", p0, p1, p2.i));
		ignored;
	}

	function log(string memory p0, bool p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,bool,string)", p0, p1, p2));
		ignored;
	}

	function log(string memory p0, bool p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,bool,bool)", p0, p1, p2));
		ignored;
	}

	function log(string memory p0, bool p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,bool,address)", p0, p1, p2));
		ignored;
	}

	function log(string memory p0, bool p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,bool,(bytes))", p0, p1, p2.b));
		ignored;
	}

	function log(string memory p0, bool p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,bool,(bytes32))", p0, p1, p2.b));
		ignored;
	}

	function log(string memory p0, address p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,address,uint256)", p0, p1, p2));
		ignored;
	}

	function log(string memory p0, address p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,address,(int256))", p0, p1, p2.i));
		ignored;
	}

	function log(string memory p0, address p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,address,string)", p0, p1, p2));
		ignored;
	}

	function log(string memory p0, address p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,address,bool)", p0, p1, p2));
		ignored;
	}

	function log(string memory p0, address p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,address,address)", p0, p1, p2));
		ignored;
	}

	function log(string memory p0, address p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,address,(bytes))", p0, p1, p2.b));
		ignored;
	}

	function log(string memory p0, address p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,address,(bytes32))", p0, p1, p2.b));
		ignored;
	}

	function log(string memory p0, WrappedBytes memory p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,(bytes),uint256)", p0, p1.b, p2));
		ignored;
	}

	function log(string memory p0, WrappedBytes memory p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,(bytes),(int256))", p0, p1.b, p2.i));
		ignored;
	}

	function log(string memory p0, WrappedBytes memory p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,(bytes),string)", p0, p1.b, p2));
		ignored;
	}

	function log(string memory p0, WrappedBytes memory p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,(bytes),bool)", p0, p1.b, p2));
		ignored;
	}

	function log(string memory p0, WrappedBytes memory p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,(bytes),address)", p0, p1.b, p2));
		ignored;
	}

	function log(string memory p0, WrappedBytes memory p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,(bytes),(bytes))", p0, p1.b, p2.b));
		ignored;
	}

	function log(string memory p0, WrappedBytes memory p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,(bytes),(bytes32))", p0, p1.b, p2.b));
		ignored;
	}

	function log(string memory p0, WrappedBytes32 memory p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,(bytes32),uint256)", p0, p1.b, p2));
		ignored;
	}

	function log(string memory p0, WrappedBytes32 memory p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,(bytes32),(int256))", p0, p1.b, p2.i));
		ignored;
	}

	function log(string memory p0, WrappedBytes32 memory p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,(bytes32),string)", p0, p1.b, p2));
		ignored;
	}

	function log(string memory p0, WrappedBytes32 memory p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,(bytes32),bool)", p0, p1.b, p2));
		ignored;
	}

	function log(string memory p0, WrappedBytes32 memory p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,(bytes32),address)", p0, p1.b, p2));
		ignored;
	}

	function log(string memory p0, WrappedBytes32 memory p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,(bytes32),(bytes))", p0, p1.b, p2.b));
		ignored;
	}

	function log(string memory p0, WrappedBytes32 memory p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(string,(bytes32),(bytes32))", p0, p1.b, p2.b));
		ignored;
	}

	function log(bool p0, uint256 p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,uint256,uint256)", p0, p1, p2));
		ignored;
	}

	function log(bool p0, uint256 p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,uint256,(int256))", p0, p1, p2.i));
		ignored;
	}

	function log(bool p0, uint256 p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,uint256,string)", p0, p1, p2));
		ignored;
	}

	function log(bool p0, uint256 p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,uint256,bool)", p0, p1, p2));
		ignored;
	}

	function log(bool p0, uint256 p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,uint256,address)", p0, p1, p2));
		ignored;
	}

	function log(bool p0, uint256 p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,uint256,(bytes))", p0, p1, p2.b));
		ignored;
	}

	function log(bool p0, uint256 p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,uint256,(bytes32))", p0, p1, p2.b));
		ignored;
	}

	function log(bool p0, WrappedInt memory p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,(int256),uint256)", p0, p1.i, p2));
		ignored;
	}

	function log(bool p0, WrappedInt memory p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,(int256),(int256))", p0, p1.i, p2.i));
		ignored;
	}

	function log(bool p0, WrappedInt memory p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,(int256),string)", p0, p1.i, p2));
		ignored;
	}

	function log(bool p0, WrappedInt memory p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,(int256),bool)", p0, p1.i, p2));
		ignored;
	}

	function log(bool p0, WrappedInt memory p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,(int256),address)", p0, p1.i, p2));
		ignored;
	}

	function log(bool p0, WrappedInt memory p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,(int256),(bytes))", p0, p1.i, p2.b));
		ignored;
	}

	function log(bool p0, WrappedInt memory p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,(int256),(bytes32))", p0, p1.i, p2.b));
		ignored;
	}

	function log(bool p0, string memory p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,string,uint256)", p0, p1, p2));
		ignored;
	}

	function log(bool p0, string memory p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,string,(int256))", p0, p1, p2.i));
		ignored;
	}

	function log(bool p0, string memory p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,string,string)", p0, p1, p2));
		ignored;
	}

	function log(bool p0, string memory p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,string,bool)", p0, p1, p2));
		ignored;
	}

	function log(bool p0, string memory p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,string,address)", p0, p1, p2));
		ignored;
	}

	function log(bool p0, string memory p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,string,(bytes))", p0, p1, p2.b));
		ignored;
	}

	function log(bool p0, string memory p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,string,(bytes32))", p0, p1, p2.b));
		ignored;
	}

	function log(bool p0, bool p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,bool,uint256)", p0, p1, p2));
		ignored;
	}

	function log(bool p0, bool p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,bool,(int256))", p0, p1, p2.i));
		ignored;
	}

	function log(bool p0, bool p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,bool,string)", p0, p1, p2));
		ignored;
	}

	function log(bool p0, bool p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,bool,bool)", p0, p1, p2));
		ignored;
	}

	function log(bool p0, bool p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,bool,address)", p0, p1, p2));
		ignored;
	}

	function log(bool p0, bool p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,bool,(bytes))", p0, p1, p2.b));
		ignored;
	}

	function log(bool p0, bool p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,bool,(bytes32))", p0, p1, p2.b));
		ignored;
	}

	function log(bool p0, address p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,address,uint256)", p0, p1, p2));
		ignored;
	}

	function log(bool p0, address p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,address,(int256))", p0, p1, p2.i));
		ignored;
	}

	function log(bool p0, address p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,address,string)", p0, p1, p2));
		ignored;
	}

	function log(bool p0, address p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,address,bool)", p0, p1, p2));
		ignored;
	}

	function log(bool p0, address p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,address,address)", p0, p1, p2));
		ignored;
	}

	function log(bool p0, address p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,address,(bytes))", p0, p1, p2.b));
		ignored;
	}

	function log(bool p0, address p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,address,(bytes32))", p0, p1, p2.b));
		ignored;
	}

	function log(bool p0, WrappedBytes memory p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,(bytes),uint256)", p0, p1.b, p2));
		ignored;
	}

	function log(bool p0, WrappedBytes memory p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,(bytes),(int256))", p0, p1.b, p2.i));
		ignored;
	}

	function log(bool p0, WrappedBytes memory p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,(bytes),string)", p0, p1.b, p2));
		ignored;
	}

	function log(bool p0, WrappedBytes memory p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,(bytes),bool)", p0, p1.b, p2));
		ignored;
	}

	function log(bool p0, WrappedBytes memory p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,(bytes),address)", p0, p1.b, p2));
		ignored;
	}

	function log(bool p0, WrappedBytes memory p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,(bytes),(bytes))", p0, p1.b, p2.b));
		ignored;
	}

	function log(bool p0, WrappedBytes memory p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,(bytes),(bytes32))", p0, p1.b, p2.b));
		ignored;
	}

	function log(bool p0, WrappedBytes32 memory p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,(bytes32),uint256)", p0, p1.b, p2));
		ignored;
	}

	function log(bool p0, WrappedBytes32 memory p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,(bytes32),(int256))", p0, p1.b, p2.i));
		ignored;
	}

	function log(bool p0, WrappedBytes32 memory p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,(bytes32),string)", p0, p1.b, p2));
		ignored;
	}

	function log(bool p0, WrappedBytes32 memory p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,(bytes32),bool)", p0, p1.b, p2));
		ignored;
	}

	function log(bool p0, WrappedBytes32 memory p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,(bytes32),address)", p0, p1.b, p2));
		ignored;
	}

	function log(bool p0, WrappedBytes32 memory p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,(bytes32),(bytes))", p0, p1.b, p2.b));
		ignored;
	}

	function log(bool p0, WrappedBytes32 memory p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(bool,(bytes32),(bytes32))", p0, p1.b, p2.b));
		ignored;
	}

	function log(address p0, uint256 p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,uint256,uint256)", p0, p1, p2));
		ignored;
	}

	function log(address p0, uint256 p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,uint256,(int256))", p0, p1, p2.i));
		ignored;
	}

	function log(address p0, uint256 p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,uint256,string)", p0, p1, p2));
		ignored;
	}

	function log(address p0, uint256 p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,uint256,bool)", p0, p1, p2));
		ignored;
	}

	function log(address p0, uint256 p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,uint256,address)", p0, p1, p2));
		ignored;
	}

	function log(address p0, uint256 p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,uint256,(bytes))", p0, p1, p2.b));
		ignored;
	}

	function log(address p0, uint256 p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,uint256,(bytes32))", p0, p1, p2.b));
		ignored;
	}

	function log(address p0, WrappedInt memory p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,(int256),uint256)", p0, p1.i, p2));
		ignored;
	}

	function log(address p0, WrappedInt memory p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,(int256),(int256))", p0, p1.i, p2.i));
		ignored;
	}

	function log(address p0, WrappedInt memory p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,(int256),string)", p0, p1.i, p2));
		ignored;
	}

	function log(address p0, WrappedInt memory p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,(int256),bool)", p0, p1.i, p2));
		ignored;
	}

	function log(address p0, WrappedInt memory p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,(int256),address)", p0, p1.i, p2));
		ignored;
	}

	function log(address p0, WrappedInt memory p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,(int256),(bytes))", p0, p1.i, p2.b));
		ignored;
	}

	function log(address p0, WrappedInt memory p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,(int256),(bytes32))", p0, p1.i, p2.b));
		ignored;
	}

	function log(address p0, string memory p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,string,uint256)", p0, p1, p2));
		ignored;
	}

	function log(address p0, string memory p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,string,(int256))", p0, p1, p2.i));
		ignored;
	}

	function log(address p0, string memory p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,string,string)", p0, p1, p2));
		ignored;
	}

	function log(address p0, string memory p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,string,bool)", p0, p1, p2));
		ignored;
	}

	function log(address p0, string memory p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,string,address)", p0, p1, p2));
		ignored;
	}

	function log(address p0, string memory p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,string,(bytes))", p0, p1, p2.b));
		ignored;
	}

	function log(address p0, string memory p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,string,(bytes32))", p0, p1, p2.b));
		ignored;
	}

	function log(address p0, bool p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,bool,uint256)", p0, p1, p2));
		ignored;
	}

	function log(address p0, bool p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,bool,(int256))", p0, p1, p2.i));
		ignored;
	}

	function log(address p0, bool p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,bool,string)", p0, p1, p2));
		ignored;
	}

	function log(address p0, bool p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,bool,bool)", p0, p1, p2));
		ignored;
	}

	function log(address p0, bool p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,bool,address)", p0, p1, p2));
		ignored;
	}

	function log(address p0, bool p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,bool,(bytes))", p0, p1, p2.b));
		ignored;
	}

	function log(address p0, bool p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,bool,(bytes32))", p0, p1, p2.b));
		ignored;
	}

	function log(address p0, address p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,address,uint256)", p0, p1, p2));
		ignored;
	}

	function log(address p0, address p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,address,(int256))", p0, p1, p2.i));
		ignored;
	}

	function log(address p0, address p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,address,string)", p0, p1, p2));
		ignored;
	}

	function log(address p0, address p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,address,bool)", p0, p1, p2));
		ignored;
	}

	function log(address p0, address p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,address,address)", p0, p1, p2));
		ignored;
	}

	function log(address p0, address p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,address,(bytes))", p0, p1, p2.b));
		ignored;
	}

	function log(address p0, address p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,address,(bytes32))", p0, p1, p2.b));
		ignored;
	}

	function log(address p0, WrappedBytes memory p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,(bytes),uint256)", p0, p1.b, p2));
		ignored;
	}

	function log(address p0, WrappedBytes memory p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,(bytes),(int256))", p0, p1.b, p2.i));
		ignored;
	}

	function log(address p0, WrappedBytes memory p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,(bytes),string)", p0, p1.b, p2));
		ignored;
	}

	function log(address p0, WrappedBytes memory p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,(bytes),bool)", p0, p1.b, p2));
		ignored;
	}

	function log(address p0, WrappedBytes memory p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,(bytes),address)", p0, p1.b, p2));
		ignored;
	}

	function log(address p0, WrappedBytes memory p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,(bytes),(bytes))", p0, p1.b, p2.b));
		ignored;
	}

	function log(address p0, WrappedBytes memory p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,(bytes),(bytes32))", p0, p1.b, p2.b));
		ignored;
	}

	function log(address p0, WrappedBytes32 memory p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,(bytes32),uint256)", p0, p1.b, p2));
		ignored;
	}

	function log(address p0, WrappedBytes32 memory p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,(bytes32),(int256))", p0, p1.b, p2.i));
		ignored;
	}

	function log(address p0, WrappedBytes32 memory p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,(bytes32),string)", p0, p1.b, p2));
		ignored;
	}

	function log(address p0, WrappedBytes32 memory p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,(bytes32),bool)", p0, p1.b, p2));
		ignored;
	}

	function log(address p0, WrappedBytes32 memory p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,(bytes32),address)", p0, p1.b, p2));
		ignored;
	}

	function log(address p0, WrappedBytes32 memory p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,(bytes32),(bytes))", p0, p1.b, p2.b));
		ignored;
	}

	function log(address p0, WrappedBytes32 memory p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log(address,(bytes32),(bytes32))", p0, p1.b, p2.b));
		ignored;
	}

	function log(WrappedBytes memory p0, uint256 p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),uint256,uint256)", p0.b, p1, p2));
		ignored;
	}

	function log(WrappedBytes memory p0, uint256 p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),uint256,(int256))", p0.b, p1, p2.i));
		ignored;
	}

	function log(WrappedBytes memory p0, uint256 p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),uint256,string)", p0.b, p1, p2));
		ignored;
	}

	function log(WrappedBytes memory p0, uint256 p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),uint256,bool)", p0.b, p1, p2));
		ignored;
	}

	function log(WrappedBytes memory p0, uint256 p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),uint256,address)", p0.b, p1, p2));
		ignored;
	}

	function log(WrappedBytes memory p0, uint256 p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),uint256,(bytes))", p0.b, p1, p2.b));
		ignored;
	}

	function log(WrappedBytes memory p0, uint256 p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),uint256,(bytes32))", p0.b, p1, p2.b));
		ignored;
	}

	function log(WrappedBytes memory p0, WrappedInt memory p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),(int256),uint256)", p0.b, p1.i, p2));
		ignored;
	}

	function log(WrappedBytes memory p0, WrappedInt memory p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),(int256),(int256))", p0.b, p1.i, p2.i));
		ignored;
	}

	function log(WrappedBytes memory p0, WrappedInt memory p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),(int256),string)", p0.b, p1.i, p2));
		ignored;
	}

	function log(WrappedBytes memory p0, WrappedInt memory p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),(int256),bool)", p0.b, p1.i, p2));
		ignored;
	}

	function log(WrappedBytes memory p0, WrappedInt memory p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),(int256),address)", p0.b, p1.i, p2));
		ignored;
	}

	function log(WrappedBytes memory p0, WrappedInt memory p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),(int256),(bytes))", p0.b, p1.i, p2.b));
		ignored;
	}

	function log(WrappedBytes memory p0, WrappedInt memory p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),(int256),(bytes32))", p0.b, p1.i, p2.b));
		ignored;
	}

	function log(WrappedBytes memory p0, string memory p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),string,uint256)", p0.b, p1, p2));
		ignored;
	}

	function log(WrappedBytes memory p0, string memory p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),string,(int256))", p0.b, p1, p2.i));
		ignored;
	}

	function log(WrappedBytes memory p0, string memory p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),string,string)", p0.b, p1, p2));
		ignored;
	}

	function log(WrappedBytes memory p0, string memory p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),string,bool)", p0.b, p1, p2));
		ignored;
	}

	function log(WrappedBytes memory p0, string memory p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),string,address)", p0.b, p1, p2));
		ignored;
	}

	function log(WrappedBytes memory p0, string memory p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),string,(bytes))", p0.b, p1, p2.b));
		ignored;
	}

	function log(WrappedBytes memory p0, string memory p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),string,(bytes32))", p0.b, p1, p2.b));
		ignored;
	}

	function log(WrappedBytes memory p0, bool p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),bool,uint256)", p0.b, p1, p2));
		ignored;
	}

	function log(WrappedBytes memory p0, bool p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),bool,(int256))", p0.b, p1, p2.i));
		ignored;
	}

	function log(WrappedBytes memory p0, bool p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),bool,string)", p0.b, p1, p2));
		ignored;
	}

	function log(WrappedBytes memory p0, bool p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),bool,bool)", p0.b, p1, p2));
		ignored;
	}

	function log(WrappedBytes memory p0, bool p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),bool,address)", p0.b, p1, p2));
		ignored;
	}

	function log(WrappedBytes memory p0, bool p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),bool,(bytes))", p0.b, p1, p2.b));
		ignored;
	}

	function log(WrappedBytes memory p0, bool p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),bool,(bytes32))", p0.b, p1, p2.b));
		ignored;
	}

	function log(WrappedBytes memory p0, address p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),address,uint256)", p0.b, p1, p2));
		ignored;
	}

	function log(WrappedBytes memory p0, address p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),address,(int256))", p0.b, p1, p2.i));
		ignored;
	}

	function log(WrappedBytes memory p0, address p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),address,string)", p0.b, p1, p2));
		ignored;
	}

	function log(WrappedBytes memory p0, address p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),address,bool)", p0.b, p1, p2));
		ignored;
	}

	function log(WrappedBytes memory p0, address p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),address,address)", p0.b, p1, p2));
		ignored;
	}

	function log(WrappedBytes memory p0, address p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),address,(bytes))", p0.b, p1, p2.b));
		ignored;
	}

	function log(WrappedBytes memory p0, address p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),address,(bytes32))", p0.b, p1, p2.b));
		ignored;
	}

	function log(WrappedBytes memory p0, WrappedBytes memory p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),(bytes),uint256)", p0.b, p1.b, p2));
		ignored;
	}

	function log(WrappedBytes memory p0, WrappedBytes memory p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),(bytes),(int256))", p0.b, p1.b, p2.i));
		ignored;
	}

	function log(WrappedBytes memory p0, WrappedBytes memory p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),(bytes),string)", p0.b, p1.b, p2));
		ignored;
	}

	function log(WrappedBytes memory p0, WrappedBytes memory p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),(bytes),bool)", p0.b, p1.b, p2));
		ignored;
	}

	function log(WrappedBytes memory p0, WrappedBytes memory p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),(bytes),address)", p0.b, p1.b, p2));
		ignored;
	}

	function log(WrappedBytes memory p0, WrappedBytes memory p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),(bytes),(bytes))", p0.b, p1.b, p2.b));
		ignored;
	}

	function log(WrappedBytes memory p0, WrappedBytes memory p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),(bytes),(bytes32))", p0.b, p1.b, p2.b));
		ignored;
	}

	function log(WrappedBytes memory p0, WrappedBytes32 memory p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),(bytes32),uint256)", p0.b, p1.b, p2));
		ignored;
	}

	function log(WrappedBytes memory p0, WrappedBytes32 memory p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),(bytes32),(int256))", p0.b, p1.b, p2.i));
		ignored;
	}

	function log(WrappedBytes memory p0, WrappedBytes32 memory p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),(bytes32),string)", p0.b, p1.b, p2));
		ignored;
	}

	function log(WrappedBytes memory p0, WrappedBytes32 memory p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),(bytes32),bool)", p0.b, p1.b, p2));
		ignored;
	}

	function log(WrappedBytes memory p0, WrappedBytes32 memory p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),(bytes32),address)", p0.b, p1.b, p2));
		ignored;
	}

	function log(WrappedBytes memory p0, WrappedBytes32 memory p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),(bytes32),(bytes))", p0.b, p1.b, p2.b));
		ignored;
	}

	function log(WrappedBytes memory p0, WrappedBytes32 memory p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes),(bytes32),(bytes32))", p0.b, p1.b, p2.b));
		ignored;
	}

	function log(WrappedBytes32 memory p0, uint256 p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),uint256,uint256)", p0.b, p1, p2));
		ignored;
	}

	function log(WrappedBytes32 memory p0, uint256 p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),uint256,(int256))", p0.b, p1, p2.i));
		ignored;
	}

	function log(WrappedBytes32 memory p0, uint256 p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),uint256,string)", p0.b, p1, p2));
		ignored;
	}

	function log(WrappedBytes32 memory p0, uint256 p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),uint256,bool)", p0.b, p1, p2));
		ignored;
	}

	function log(WrappedBytes32 memory p0, uint256 p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),uint256,address)", p0.b, p1, p2));
		ignored;
	}

	function log(WrappedBytes32 memory p0, uint256 p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),uint256,(bytes))", p0.b, p1, p2.b));
		ignored;
	}

	function log(WrappedBytes32 memory p0, uint256 p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),uint256,(bytes32))", p0.b, p1, p2.b));
		ignored;
	}

	function log(WrappedBytes32 memory p0, WrappedInt memory p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),(int256),uint256)", p0.b, p1.i, p2));
		ignored;
	}

	function log(WrappedBytes32 memory p0, WrappedInt memory p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),(int256),(int256))", p0.b, p1.i, p2.i));
		ignored;
	}

	function log(WrappedBytes32 memory p0, WrappedInt memory p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),(int256),string)", p0.b, p1.i, p2));
		ignored;
	}

	function log(WrappedBytes32 memory p0, WrappedInt memory p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),(int256),bool)", p0.b, p1.i, p2));
		ignored;
	}

	function log(WrappedBytes32 memory p0, WrappedInt memory p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),(int256),address)", p0.b, p1.i, p2));
		ignored;
	}

	function log(WrappedBytes32 memory p0, WrappedInt memory p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),(int256),(bytes))", p0.b, p1.i, p2.b));
		ignored;
	}

	function log(WrappedBytes32 memory p0, WrappedInt memory p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),(int256),(bytes32))", p0.b, p1.i, p2.b));
		ignored;
	}

	function log(WrappedBytes32 memory p0, string memory p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),string,uint256)", p0.b, p1, p2));
		ignored;
	}

	function log(WrappedBytes32 memory p0, string memory p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),string,(int256))", p0.b, p1, p2.i));
		ignored;
	}

	function log(WrappedBytes32 memory p0, string memory p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),string,string)", p0.b, p1, p2));
		ignored;
	}

	function log(WrappedBytes32 memory p0, string memory p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),string,bool)", p0.b, p1, p2));
		ignored;
	}

	function log(WrappedBytes32 memory p0, string memory p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),string,address)", p0.b, p1, p2));
		ignored;
	}

	function log(WrappedBytes32 memory p0, string memory p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),string,(bytes))", p0.b, p1, p2.b));
		ignored;
	}

	function log(WrappedBytes32 memory p0, string memory p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),string,(bytes32))", p0.b, p1, p2.b));
		ignored;
	}

	function log(WrappedBytes32 memory p0, bool p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),bool,uint256)", p0.b, p1, p2));
		ignored;
	}

	function log(WrappedBytes32 memory p0, bool p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),bool,(int256))", p0.b, p1, p2.i));
		ignored;
	}

	function log(WrappedBytes32 memory p0, bool p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),bool,string)", p0.b, p1, p2));
		ignored;
	}

	function log(WrappedBytes32 memory p0, bool p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),bool,bool)", p0.b, p1, p2));
		ignored;
	}

	function log(WrappedBytes32 memory p0, bool p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),bool,address)", p0.b, p1, p2));
		ignored;
	}

	function log(WrappedBytes32 memory p0, bool p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),bool,(bytes))", p0.b, p1, p2.b));
		ignored;
	}

	function log(WrappedBytes32 memory p0, bool p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),bool,(bytes32))", p0.b, p1, p2.b));
		ignored;
	}

	function log(WrappedBytes32 memory p0, address p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),address,uint256)", p0.b, p1, p2));
		ignored;
	}

	function log(WrappedBytes32 memory p0, address p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),address,(int256))", p0.b, p1, p2.i));
		ignored;
	}

	function log(WrappedBytes32 memory p0, address p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),address,string)", p0.b, p1, p2));
		ignored;
	}

	function log(WrappedBytes32 memory p0, address p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),address,bool)", p0.b, p1, p2));
		ignored;
	}

	function log(WrappedBytes32 memory p0, address p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),address,address)", p0.b, p1, p2));
		ignored;
	}

	function log(WrappedBytes32 memory p0, address p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),address,(bytes))", p0.b, p1, p2.b));
		ignored;
	}

	function log(WrappedBytes32 memory p0, address p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),address,(bytes32))", p0.b, p1, p2.b));
		ignored;
	}

	function log(WrappedBytes32 memory p0, WrappedBytes memory p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),(bytes),uint256)", p0.b, p1.b, p2));
		ignored;
	}

	function log(WrappedBytes32 memory p0, WrappedBytes memory p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),(bytes),(int256))", p0.b, p1.b, p2.i));
		ignored;
	}

	function log(WrappedBytes32 memory p0, WrappedBytes memory p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),(bytes),string)", p0.b, p1.b, p2));
		ignored;
	}

	function log(WrappedBytes32 memory p0, WrappedBytes memory p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),(bytes),bool)", p0.b, p1.b, p2));
		ignored;
	}

	function log(WrappedBytes32 memory p0, WrappedBytes memory p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),(bytes),address)", p0.b, p1.b, p2));
		ignored;
	}

	function log(WrappedBytes32 memory p0, WrappedBytes memory p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),(bytes),(bytes))", p0.b, p1.b, p2.b));
		ignored;
	}

	function log(WrappedBytes32 memory p0, WrappedBytes memory p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),(bytes),(bytes32))", p0.b, p1.b, p2.b));
		ignored;
	}

	function log(WrappedBytes32 memory p0, WrappedBytes32 memory p1, uint256 p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),(bytes32),uint256)", p0.b, p1.b, p2));
		ignored;
	}

	function log(WrappedBytes32 memory p0, WrappedBytes32 memory p1, WrappedInt memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),(bytes32),(int256))", p0.b, p1.b, p2.i));
		ignored;
	}

	function log(WrappedBytes32 memory p0, WrappedBytes32 memory p1, string memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),(bytes32),string)", p0.b, p1.b, p2));
		ignored;
	}

	function log(WrappedBytes32 memory p0, WrappedBytes32 memory p1, bool p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),(bytes32),bool)", p0.b, p1.b, p2));
		ignored;
	}

	function log(WrappedBytes32 memory p0, WrappedBytes32 memory p1, address p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),(bytes32),address)", p0.b, p1.b, p2));
		ignored;
	}

	function log(WrappedBytes32 memory p0, WrappedBytes32 memory p1, WrappedBytes memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),(bytes32),(bytes))", p0.b, p1.b, p2.b));
		ignored;
	}

	function log(WrappedBytes32 memory p0, WrappedBytes32 memory p1, WrappedBytes32 memory p2) internal view {
		address CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);
		(bool ignored, ) = CONSOLE_ADDRESS.staticcall(abi.encodeWithSignature("log((bytes32),(bytes32),(bytes32))", p0.b, p1.b, p2.b));
		ignored;
	}

}
