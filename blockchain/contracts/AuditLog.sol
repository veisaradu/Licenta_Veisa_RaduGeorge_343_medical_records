// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract AuditLog {
    event AccessLogged(
        string indexed accessor,
        string indexed recordId,
        string action,
        uint256 timestamp
    );

    function logAccess(
        string memory accessor,
        string memory recordId,
        string memory action
    ) external {
        emit AccessLogged(accessor, recordId, action, block.timestamp);
    }
}