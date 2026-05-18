// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract MedicalRecords {
    struct Record {
        string ipfsCid;
        bytes32 documentHash;
        address owner;
        address uploadedBy;
        uint8 category;
        uint256 timestamp;
    }

    mapping(string => Record) private records;

    event RecordRegistered(
        string indexed recordId,
        address indexed owner,
        bytes32 documentHash,
        uint8 category,
        uint256 timestamp
    );

    function registerRecord(
        string memory recordId,
        string memory ipfsCid,
        bytes32 documentHash,
        address owner,
        uint8 category
    ) external {
        require(bytes(records[recordId].ipfsCid).length == 0, "Record exists");
        records[recordId] = Record(
            ipfsCid,
            documentHash,
            owner,
            msg.sender,
            category,
            block.timestamp
        );
        emit RecordRegistered(recordId, owner, documentHash, category, block.timestamp);
    }

    function getRecord(string memory recordId) external view returns (Record memory) {
        return records[recordId];
    }
}