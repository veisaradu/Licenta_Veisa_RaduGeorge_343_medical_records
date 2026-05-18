const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  const MedicalRecords = await ethers.getContractFactory("MedicalRecords");
  const medicalRecords = await MedicalRecords.deploy();
  await medicalRecords.waitForDeployment();
  const mrAddress = await medicalRecords.getAddress();
  console.log("MedicalRecords deployed to:", mrAddress);

  const Consent = await ethers.getContractFactory("Consent");
  const consent = await Consent.deploy();
  await consent.waitForDeployment();
  const consentAddress = await consent.getAddress();
  console.log("Consent deployed to:", consentAddress);

  const AuditLog = await ethers.getContractFactory("AuditLog");
  const auditLog = await AuditLog.deploy();
  await auditLog.waitForDeployment();
  const auditAddress = await auditLog.getAddress();
  console.log("AuditLog deployed to:", auditAddress);

  console.log(`MEDICAL_RECORDS_ADDRESS="${mrAddress}"`);
  console.log(`CONSENT_ADDRESS="${consentAddress}"`);
  console.log(`AUDIT_LOG_ADDRESS="${auditAddress}"`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
