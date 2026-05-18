const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MedicalRecords", function () {
  let contract, owner, doctor;

  beforeEach(async () => {
    [owner, doctor] = await ethers.getSigners();
    const MR = await ethers.getContractFactory("MedicalRecords");
    contract = await MR.deploy();
  });

  it("should register a record", async () => {
    const hash = ethers.encodeBytes32String("testhash");
    await contract.connect(doctor).registerRecord("rec1", "QmTest", hash, owner.address, 0);
    const rec = await contract.getRecord("rec1");
    expect(rec.owner).to.equal(owner.address);
    expect(rec.category).to.equal(0);
  });

  it("should not allow duplicate registration", async () => {
    const hash = ethers.encodeBytes32String("testhash");
    await contract.connect(doctor).registerRecord("rec1", "QmTest", hash, owner.address, 0);
    await expect(
      contract.connect(doctor).registerRecord("rec1", "QmTest2", hash, owner.address, 0)
    ).to.be.revertedWith("Record exists");
  });

  it("should store correct ipfsCid", async () => {
    const hash = ethers.encodeBytes32String("testhash");
    await contract.connect(doctor).registerRecord("rec2", "QmABC123", hash, owner.address, 1);
    const rec = await contract.getRecord("rec2");
    expect(rec.ipfsCid).to.equal("QmABC123");
  });
});