const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AuditLog", function () {
  let contract, accessor;
  const userId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(async () => {
    [accessor] = await ethers.getSigners();
    const AL = await ethers.getContractFactory("AuditLog");
    contract = await AL.deploy();
  });

  it("should emit AccessLogged event", async () => {
    await expect(
      contract.connect(accessor).logAccess(userId, "rec1", "VIEW")
    ).to.emit(contract, "AccessLogged")
      .withArgs(userId, "rec1", "VIEW", await ethers.provider.getBlock("latest").then(b => b.timestamp + 1));
  });

  it("should log multiple accesses", async () => {
    await contract.connect(accessor).logAccess(userId, "rec1", "VIEW");
    await contract.connect(accessor).logAccess(userId, "rec1", "UPLOAD");
  });
});