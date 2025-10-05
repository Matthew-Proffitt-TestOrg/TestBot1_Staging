// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IBundleExecutor {
    struct Step { address to; bytes data; uint256 minOut; }
    struct Bundle { Step[] steps; address receiver; uint256 deadline; }
    event BundleExecuted(bytes32 indexed bundleHash, address indexed executor, address profitToken, uint256 profitAmount);
    function executeBundle(Bundle calldata b, bytes calldata auth) external payable;
    function previewBundle(Bundle calldata b) external view returns (int256[] memory deltas);
}
