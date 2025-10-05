// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import "../src/exec/BundleExecutor.sol";

contract BundleExecutorTest is Test {
    function testDeploy() public {
        BundleExecutor exec = new BundleExecutor(address(this));
        assertEq(exec.settlement(), address(this));
    }
}
