import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const HgalleryNFT = await ethers.getContractFactory("HgalleryNFT");
  const hgalleryNFT = await HgalleryNFT.deploy("HgalleryNFT", "HGNFT", deployer.address);

  await hgalleryNFT.waitForDeployment();

  console.log("HgalleryNFT deployed to:", hgalleryNFT.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });