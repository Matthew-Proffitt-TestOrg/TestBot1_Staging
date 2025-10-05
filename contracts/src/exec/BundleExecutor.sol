// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IBundleExecutor} from "./IBundleExecutor.sol";

contract BundleExecutor is IBundleExecutor {
    address public immutable settlement;

    constructor(address _settlement) {
        settlement = _settlement;
    }

    function executeBundle(Bundle calldata b, bytes calldata /*auth*/) external payable override {
        require(b.receiver == settlement, "receiver mismatch");
        // NOTE: call sequence omitted; this is a scaffold.
        emit BundleExecuted(keccak256(abi.encode(b)), msg.sender, address(0), 0);
    }

    function previewBundle(Bundle calldata /*b*/) external pure override returns (int256[] memory deltas) {
        deltas = new int256[](0);
    }
}
