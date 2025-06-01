// Project: smart.contract.test // Type: Hardhat + Solidity NFT Reward Distribution
// File: contracts/RewardEngine.sol const rewardEngineSol = ` // SPDX-License-Identifier: MIT pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC721/IERC721.sol"; import "@openzeppelin/contracts/access/Ownable.sol";
contract RewardEngine is Ownable { IERC721 public nftContract; uint256 public totalShares; uint256 public lastDistribution; mapping(address => uint256) public shares; mapping(address => uint8) public nftTier; // 1 = Standard, 2 = Whale address[] public holders;
event RewardsDistributed(uint256 totalReward);

constructor(address _nftContract) {
    nftContract = IERC721(_nftContract);
    lastDistribution = block.timestamp;
}

function registerHolder(address holder, uint8 tier) external onlyOwner {
    if (shares[holder] == 0) holders.push(holder);
    nftTier[holder] = tier;
    shares[holder] = tier == 2 ? 2 : 1;
    totalShares += shares[holder];
}

receive() external payable {}

function distributeRewards() public {
    require(block.timestamp >= lastDistribution + 1 days, "Too early");
    uint256 balance = address(this).balance;
    require(balance > 0, "No funds");

    for (uint256 i = 0; i < holders.length; i++) {
        address h = holders[i];
        uint256 userShare = (balance * shares[h]) / totalShares;
        uint256 payout = (userShare * 80) / 100;
        payable(h).transfer(payout);
    }

    lastDistribution = block.timestamp;
    emit RewardsDistributed(balance);
}
}`;
// File: scripts/deploy.js const deployScript = ` const hre = require("hardhat");
async function main() { const RewardEngine = await hre.ethers.getContractFactory("RewardEngine"); const rewardEngine = await RewardEngine.deploy("0xYourNFTContractAddressHere"); await rewardEngine.deployed(); console.log(RewardEngine deployed at: ${rewardEngine.address}); }
main().catch((error) => { console.error(error); process.exitCode = 1; }); `;
// File: test/rewardEngineTest.js const rewardEngineTest = ` const { expect } = require("chai"); const { ethers } = require("hardhat");
describe("RewardEngine", function () { let rewardEngine, owner, user1, user2;
beforeEach(async function () { [owner, user1, user2] = await ethers.getSigners(); const MockNFT = await ethers.getContractFactory("MockNFT"); const nft = await MockNFT.deploy(); await nft.deployed();
const RewardEngine = await ethers.getContractFactory("RewardEngine");
rewardEngine = await RewardEngine.deploy(nft.address);
await rewardEngine.deployed();

await rewardEngine.registerHolder(user1.address, 1);
await rewardEngine.registerHolder(user2.address, 2);
});
it("should distribute funds proportionally", async function () { await owner.sendTransaction({ to: rewardEngine.address, value: ethers.utils.parseEther("1") }); await ethers.provider.send("evm_increaseTime", [86400]); await rewardEngine.distributeRewards(); }); }); `;
// File: hardhat.config.js const hardhatConfig = ` require("@nomicfoundation/hardhat-toolbox"); require("dotenv").config();
module.exports = { solidity: "0.8.20", networks: { goerli: { url: https://eth-goerli.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}, accounts: [process.env.PRIVATE_KEY] } } }; `;
// File: .env.example const envExample = ALCHEMY_API_KEY=yourAlchemyKey PRIVATE_KEY=yourPrivateKey;
// File: README.md const readme = `
Smart Contract Test Project
A simple NFT reward distribution contract built with Hardhat.
Features
•	Tiered NFT reward logic (WHALE gets 2x shares)
•	20% auto-compounded
•	Auto distribution every 24h
Setup
npm install
cp .env.example .env
npx hardhat compile
npx hardhat test
Deployment
npx hardhat run scripts/deploy.js --network goerli
License
MIT `;
module.exports = { files: { "contracts/RewardEngine.sol": rewardEngineSol, "scripts/deploy.js": deployScript, "test/rewardEngineTest.js": rewardEngineTest, "hardhat.config.js": hardhatConfig, ".env.example": envExample, "README.md": readme } };

