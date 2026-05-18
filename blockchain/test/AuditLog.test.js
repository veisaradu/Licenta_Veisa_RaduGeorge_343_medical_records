const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AuditLog", function () {
  let contract, accessor;

  beforeEach(async () => {
    [accessor] = await ethers.getSigners();
    const AL = await ethers.getContractFactory("AuditLog");
    contract = await AL.deploy();
  });

  it("should emit AccessLogged event", async () => {
    await expect(
      contract.connect(accessor).logAccess(accessor.address, "rec1", "VIEW")
    ).to.emit(contract, "AccessLogged")
      .withArgs(accessor.address, "rec1", "VIEW", await ethers.provider.getBlock("latest").then(b => b.timestamp + 1));
  });

  it("should log multiple accesses", async () => {
    await contract.connect(accessor).logAccess(accessor.address, "rec1", "VIEW");
    await contract.connect(accessor).logAccess(accessor.address, "rec1", "UPLOAD");
  });
});