// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.19 <0.9.0;

import { E, PI, UNIT, ZERO } from "src/sd59x18/Constants.sol";
import { pow } from "src/sd59x18/Math.sol";
import { SD59x18 } from "src/sd59x18/ValueType.sol";

import { SD59x18_Unit_Test } from "../../SD59x18.t.sol";

contract Pow_Unit_Test is SD59x18_Unit_Test {
    function test_Pow_BaseZero_ExponentZero() external pure {
        SD59x18 x = ZERO;
        SD59x18 y = ZERO;
        SD59x18 actual = pow(x, y);
        SD59x18 expected = UNIT;
        assertEq(actual, expected, "SD59x18 pow");
    }

    function test_Pow_BaseZero_ExponentNotZero() external pure {
        SD59x18 x = ZERO;
        SD59x18 y = UNIT;
        SD59x18 actual = pow(x, y);
        SD59x18 expected = ZERO;
        assertEq(actual, expected, "SD59x18 pow");
    }

    modifier whenBaseNotZero() {
        _;
    }

    function test_Pow_BaseUnit() external pure whenBaseNotZero {
        SD59x18 x = UNIT;
        SD59x18 y = PI;
        SD59x18 actual = pow(x, y);
        SD59x18 expected = UNIT;
        assertEq(actual, expected, "SD59x18 pow");
    }

    modifier whenBaseNotUnit() {
        _;
    }

    function test_Pow_ExponentZero() external pure whenBaseNotZero whenBaseNotUnit {
        SD59x18 x = PI;
        SD59x18 y = ZERO;
        SD59x18 actual = pow(x, y);
        SD59x18 expected = UNIT;
        assertEq(actual, expected, "SD59x18 pow");
    }

    modifier whenExponentNotZero() {
        _;
    }

    function test_Pow_ExponentUnit() external pure whenBaseNotZero whenBaseNotUnit whenExponentNotZero {
        SD59x18 x = PI;
        SD59x18 y = UNIT;
        SD59x18 actual = pow(x, y);
        SD59x18 expected = x;
        assertEq(actual, expected, "SD59x18 pow");
    }

    modifier whenExponentNotUnit() {
        _;
    }

    function negativeExponent_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: 0.000000000000000001e18, y: -0.000000000000000001e18, expected: 1e18 + 40 }));
        sets.push(set({ x: 0.000000000001e18, y: -4.4e9, expected: 1_000000121576500300 }));
        sets.push(set({ x: 0.1e18, y: -0.8e18, expected: 6_309573444801932444 }));
        sets.push(set({ x: 0.24e18, y: -11e18, expected: 6571678_991286039528731186 }));
        sets.push(set({ x: 0.5e18, y: -0.7373e18, expected: 1_667053032211341971 }));
        sets.push(set({ x: 0.799291e18, y: -69e18, expected: 5168450_048540730175583501 }));
        sets.push(set({ x: 1e18, y: -1e18, expected: 1e18 }));
        sets.push(set({ x: 1e18, y: NEGATIVE_PI, expected: 1e18 }));
        sets.push(set({ x: 2e18, y: -1.5e18, expected: 0.353553390593273762e18 }));
        sets.push(set({ x: E, y: NEGATIVE_E, expected: 0.065988035845312538e18 }));
        sets.push(set({ x: E, y: -1.66976e18, expected: 0.18829225035644931e18 }));
        sets.push(set({ x: PI, y: -1.5e18, expected: 0.179587122125166564e18 }));
        sets.push(set({ x: 11e18, y: -28.5e18, expected: 0 }));
        sets.push(set({ x: 32.15e18, y: -23.99e18, expected: 0 }));
        sets.push(set({ x: 406e18, y: -0.25e18, expected: 0.222776046060941016e18 }));
        sets.push(set({ x: 1729e18, y: -0.98e18, expected: 0.00067136841637396e18 }));
        sets.push(set({ x: 33441e18, y: -2.1891e18, expected: 0.000000000124709713e18 }));
        sets.push(set({ x: 2 ** 128 * 1e18 - 1, y: -1e18, expected: 0 }));
        sets.push(set({ x: 2 ** 192 * 1e18 - 1, y: -1e18, expected: 0 }));
        return sets;
    }

    function test_Pow_NegativeExponent()
        external
        parameterizedTest(negativeExponent_Sets())
        whenBaseNotZero
        whenBaseNotUnit
        whenExponentNotZero
        whenExponentNotUnit
    {
        SD59x18 actual = pow(s.x, s.y);
        assertEq(actual, s.expected, "SD59x18 pow");
    }

    function positiveExponent_Sets() internal returns (Set[] memory) {
        delete sets;
        sets.push(set({ x: 0.000000000000000001e18, y: 0.000000000000000001e18, expected: 0.99999999999999996e18 }));
        sets.push(set({ x: 1e6, y: 4.4e9, expected: 0.99999987842351448e18 }));
        sets.push(set({ x: 0.1e18, y: 0.8e18, expected: 0.158489319246111349e18 }));
        sets.push(set({ x: 0.24e18, y: 11e18, expected: 0.000000152168114316e18 }));
        sets.push(set({ x: 0.5e18, y: 0.7373e18, expected: 0.59986094064056398e18 }));
        sets.push(set({ x: 0.799291e18, y: 69e18, expected: 0.000000193481602919e18 }));
        sets.push(set({ x: 1e18, y: 2e18, expected: 1e18 }));
        sets.push(set({ x: 1e18, y: PI, expected: 1e18 }));
        sets.push(set({ x: 2e18, y: 1.5e18, expected: 2_828427124746190097 }));
        sets.push(set({ x: E, y: E, expected: 15_154262241479263793 }));
        sets.push(set({ x: E, y: 1.66976e18, expected: 5_310893029888037560 }));
        sets.push(set({ x: PI, y: PI, expected: 36_462159607207910473 }));
        sets.push(set({ x: 11e18, y: 28.5e18, expected: 478290249106383504389245497918_050372801213485439 }));
        sets.push(set({ x: 32.15e18, y: 23.99e18, expected: 1436387590627448555101723413293079116_943375472179194989 }));
        sets.push(set({ x: 406e18, y: 0.25e18, expected: 4_488812947719016318 }));
        sets.push(set({ x: 1729e18, y: 0.98e18, expected: 1489_495149922256917866 }));
        sets.push(set({ x: 33441e18, y: 2.1891e18, expected: 8018621589_681923269491820156 }));
        sets.push(
            set({
                x: 340282366920938463463374607431768211455e18,
                y: 1e18 + 1,
                expected: 340282366920938487757736552507248225013_000000000004316573
            })
        );
        sets.push(
            set({ x: 2 ** 192 * 1e18 - 1, y: 1e18 - 1, expected: 6277101735386679823624773486129835356722228023657461399187e18 })
        );
        return sets;
    }

    function test_Pow_PositiveExponent()
        external
        parameterizedTest(positiveExponent_Sets())
        whenBaseNotZero
        whenBaseNotUnit
        whenExponentNotZero
        whenExponentNotUnit
    {
        SD59x18 actual = pow(s.x, s.y);
        assertEq(actual, s.expected, "SD59x18 pow");
    }
}
