// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract TreasuryVault {
    address public owner;
    constructor() { owner = msg.sender; }
}
