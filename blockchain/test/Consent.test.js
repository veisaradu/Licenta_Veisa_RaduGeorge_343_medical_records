const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Consent", function () {
  let contract;

  const patientCNP = "1234567890123";
  const doctorCNP = "9876543210987";

  beforeEach(async () => {
    const C = await ethers.getContractFactory("Consent");
    contract = await C.deploy();
  });

  it("should grant consent", async () => {
    await contract.grantConsent(patientCNP, doctorCNP, 0);
    expect(await contract.hasConsent(patientCNP, doctorCNP, 0)).to.be.true;
  });

  it("should revoke consent", async () => {
    await contract.grantConsent(patientCNP, doctorCNP, 0);
    await contract.revokeConsent(patientCNP, doctorCNP, 0);
    expect(await contract.hasConsent(patientCNP, doctorCNP, 0)).to.be.false;
  });

  it("should be false by default", async () => {
    expect(await contract.hasConsent(patientCNP, doctorCNP, 1)).to.be.false;
  });

  it("should handle multiple categories independently", async () => {
    await contract.grantConsent(patientCNP, doctorCNP, 0);
    expect(await contract.hasConsent(patientCNP, doctorCNP, 0)).to.be.true;
    expect(await contract.hasConsent(patientCNP, doctorCNP, 1)).to.be.false;
  });
});