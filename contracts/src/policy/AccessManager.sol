// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract AccessManager {
    mapping(address => bool) public executors;
    function setExecutor(address who, bool val) external { executors[who] = val; }
}
