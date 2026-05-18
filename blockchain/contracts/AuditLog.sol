// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract AuditLog {
    event AccessLogged(
        address indexed accessor,
        string indexed recordId,
        string action,
        uint256 timestamp
    );

    function logAccess(
        address accessor,
        string memory recordId,
        string memory action
    ) external {
        emit AccessLogged(accessor, recordId, action, block.timestamp);
    }
}