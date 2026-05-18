const { ethers } = require('ethers');
const path = require('path');

let _contracts = null;

function getBlockchain() {
  if (_contracts) return _contracts;

  const MedicalRecordsABI = require(path.join(__dirname, '../../../blockchain/artifacts/contracts/MedicalRecords.sol/MedicalRecords.json'));
  const ConsentABI = require(path.join(__dirname, '../../../blockchain/artifacts/contracts/Consent.sol/Consent.json'));
  const AuditLogABI = require(path.join(__dirname, '../../../blockchain/artifacts/contracts/AuditLog.sol/AuditLog.json'));

  const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
  const signer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

  _contracts = {
    provider,
    signer,
    medicalRecordsContract: new ethers.Contract(process.env.MEDICAL_RECORDS_ADDRESS, MedicalRecordsABI.abi, signer),
    consentContract: new ethers.Contract(process.env.CONSENT_ADDRESS, ConsentABI.abi, signer),
    auditLogContract: new ethers.Contract(process.env.AUDIT_LOG_ADDRESS, AuditLogABI.abi, signer),
  };

  return _contracts;
}

module.exports = { getBlockchain };
