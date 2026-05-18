// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Consent {
    mapping(string => mapping(string => mapping(uint8 => bool))) private consents;

    event ConsentGranted(string indexed patient, string indexed doctor, uint8 category);
    event ConsentRevoked(string indexed patient, string indexed doctor, uint8 category);

    function grantConsent(string memory patient, string memory doctor, uint8 category) external {
        consents[patient][doctor][category] = true;
        emit ConsentGranted(patient, doctor, category);
    }

    function revokeConsent(string memory patient, string memory doctor, uint8 category) external {
        consents[patient][doctor][category] = false;
        emit ConsentRevoked(patient, doctor, category);
    }

    function hasConsent(string memory patient, string memory doctor, uint8 category) external view returns (bool) {
        return consents[patient][doctor][category];
    }
}
