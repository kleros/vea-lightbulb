import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import getContractAddress from "../../deploy-helpers/getContractAddress";
import { ethers } from "hardhat";

enum ReceiverChains {
  ETHEREUM_SEPOLIA = 11155111,
}

const deployReceiver: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { ethers, deployments, getNamedAccounts, getChainId, config } = hre;
  const { deploy } = deployments;
  const { providers } = ethers;

  // fallback to hardhat node signers on local network
  const deployer = (await getNamedAccounts()).deployer ?? (await hre.ethers.getSigners())[0].address;
  const chainId = Number(await getChainId());
  console.log("deploying to chainId %s with deployer %s", chainId, deployer);

  const senderNetworks = {
    ETHEREUM_SEPOLIA: config.networks.arbitrumSepolia,
  };

  // Hack to predict the deployment address on the sender chain.
  // TODO: use deterministic deployments

  // ----------------------------------------------------------------------------------------------
  const liveDeployer = async () => {
    const senderChainProvider = new providers.JsonRpcProvider(senderNetworks[ReceiverChains[chainId]].url);
    let nonce = await senderChainProvider.getTransactionCount(deployer);
    const lightBulbsSwitch = getContractAddress(deployer, nonce);
    const outbox = "0x5AD255400913515C8DA7E82E6b8A109fA5c46135";
    console.log("LightBulbsSwitch address: %s", lightBulbsSwitch);
    const lightbulb = await deploy("LightBulb", {
      from: deployer,
      args: [outbox, lightBulbsSwitch],
      log: true,
      gasPrice: ethers.utils.parseUnits("1", "gwei"),
    });

    console.log("LightBulb deployed to: %s", lightbulb.address);
  };

  // ----------------------------------------------------------------------------------------------
  await liveDeployer();
};

deployReceiver.tags = ["ArbSepoliaToSepoliaReceiver"];
deployReceiver.skip = async ({ getChainId }) => {
  const chainId = Number(await getChainId());
  console.log(chainId);
  return !ReceiverChains[chainId];
};

export default deployReceiver;
