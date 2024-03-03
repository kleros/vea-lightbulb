import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import getContractAddress from "../../deploy-helpers/getContractAddress";
import { ethers } from "hardhat";

enum SenderChains {
  ARBITRUM_SEPOLIA = 421614,
}

// TODO: use deterministic deployments
const deploySender: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { ethers, deployments, getNamedAccounts, getChainId, config } = hre;
  const { deploy } = deployments;
  const { providers } = ethers;

  // fallback to hardhat node signers on local network
  const deployer = (await getNamedAccounts()).deployer ?? (await hre.ethers.getSigners())[0].address;
  const chainId = Number(await getChainId());
  console.log("deploying to chainId %s with deployer %s", chainId, deployer);

  const ReceiverNetworks = {
    SEPOLIA: config.networks.sepolia,
  };

  // Hack to predict the deployment address on the sender chain.
  // TODO: use deterministic deployments

  // ----------------------------------------------------------------------------------------------
  const liveDeployer = async () => {
    const LightBulb = await hre.companionNetworks.receiver.deployments.get("LightBulb");
    const veaInbox = "0x77e95F54032f467eC45c48C6affc203f93858783";
    const lightBulbsSwitch = await deploy("Switch", {
      from: deployer,
      contract: "Switch",
      args: [veaInbox, LightBulb.address],
      log: true,
    });

    console.log("Switch deployed to: %s", lightBulbsSwitch.address);
  };

  // ----------------------------------------------------------------------------------------------
  await liveDeployer();
};

deploySender.tags = ["ArbSepoliaToSepoliaSender"];
deploySender.skip = async ({ getChainId }) => {
  const chainId = Number(await getChainId());
  console.log(chainId);
  return !SenderChains[chainId];
};
deploySender.runAtTheEnd = true;

export default deploySender;
