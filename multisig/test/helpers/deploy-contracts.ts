import * as aragonContracts from "@aragon/osx-ethers";

import ENSRegistry from "@ensdomains/ens-contracts/artifacts/contracts/registry/ENSRegistry.sol/ENSRegistry.json";
import PublicResolver from "@ensdomains/ens-contracts/artifacts/contracts/resolvers/PublicResolver.sol/PublicResolver.json";

import { AddressZero, HashZero } from "@ethersproject/constants";
import { JsonRpcProvider } from "@ethersproject/providers";
import { id, namehash } from "@ethersproject/hash";
import { parseEther } from "@ethersproject/units";
import { Signer } from "@ethersproject/abstract-signer";
import { Contract, ContractFactory } from "@ethersproject/contracts";
import { ERC1967ABI, ERC1967Bytecode } from "../abi";
import { toUtf8Bytes } from "@ethersproject/strings";
import { hexlify } from "@ethersproject/bytes";

const WALLET_ADDRESS = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";

export interface Deployment {
  managingDaoAddress: string;
  daoFactory: aragonContracts.DAOFactory;
  daoRegistry: aragonContracts.DAORegistry;
  ensRegistry: Contract;
  tokenVotingRepo: aragonContracts.PluginRepo;
  tokenVotingPluginSetup: aragonContracts.TokenVotingSetup;
  addresslistVotingRepo: aragonContracts.PluginRepo;
  addresslistVotingPluginSetup: aragonContracts.AddresslistVotingSetup;
  multisigRepo: aragonContracts.PluginRepo;
  multisigPluginSetup: aragonContracts.MultisigSetup;
  pluginSetupProcessor: aragonContracts.PluginSetupProcessor;
}

export async function deploy(): Promise<Deployment> {
  const provider = new JsonRpcProvider("http://127.0.0.1:8545");
  const deployOwnerWallet = provider.getSigner();
  const { ensRegistry, ensResolver } = await deployEnsContracts(
    deployOwnerWallet,
  );

  try {
    const proxyFactory = new ContractFactory(
      ERC1967ABI,
      ERC1967Bytecode,
      deployOwnerWallet,
    );
    const managingDaoFactory = new aragonContracts.DAO__factory();

    const managingDao = await managingDaoFactory
      .connect(deployOwnerWallet)
      .deploy();

    const initializeManagingDaoData = managingDaoFactory.interface
      .encodeFunctionData("initialize", [
        "0x",
        await deployOwnerWallet.getAddress(),
        AddressZero,
        "0x",
      ]);

    const managingDaoProxy = await proxyFactory.deploy(
      managingDao.address,
      initializeManagingDaoData,
    );

    const managingDaoInstance = aragonContracts.DAO__factory.connect(
      managingDaoProxy.address,
      deployOwnerWallet,
    );

    const ensSubdomainRegistrarFactory = new aragonContracts
      .ENSSubdomainRegistrar__factory();

    // DAO Registrar
    const daoRegistrar = await ensSubdomainRegistrarFactory
      .connect(deployOwnerWallet)
      .deploy();
    const pluginRegistrar = await ensSubdomainRegistrarFactory
      .connect(deployOwnerWallet)
      .deploy();

    const daoRegsitrarProxy = await proxyFactory.deploy(
      daoRegistrar.address,
      "0x",
    );
    const pluginRegistrarProxy = await proxyFactory.deploy(
      pluginRegistrar.address,
      "0x",
    );
    const daoRegistrarInstance = aragonContracts.ENSSubdomainRegistrar__factory
      .connect(daoRegsitrarProxy.address, deployOwnerWallet);
    const pluginRegistrarInstance = aragonContracts
      .ENSSubdomainRegistrar__factory
      .connect(pluginRegistrarProxy.address, deployOwnerWallet);

    await registerEnsName(
      "eth",
      "dao",
      ensRegistry,
      daoRegistrarInstance.address,
      ensResolver.address,
    );

    await registerEnsName(
      "eth",
      "plugin",
      ensRegistry,
      pluginRegistrarInstance.address,
      ensResolver.address,
    );

    await daoRegistrarInstance.initialize(
      managingDaoInstance.address,
      ensRegistry.address,
      namehash("dao.eth"),
    );

    await pluginRegistrarInstance.initialize(
      managingDaoInstance.address,
      ensRegistry.address,
      namehash("plugin.eth"),
    );
    // Dao Registry
    const daoRegistryFactory = new aragonContracts
      .DAORegistry__factory();
    const daoRegistry = await daoRegistryFactory
      .connect(deployOwnerWallet)
      .deploy();
    const daoRegistryProxy = await proxyFactory.deploy(
      daoRegistry.address,
      "0x",
    );
    const daoRegistryInstance = aragonContracts
      .DAORegistry__factory.connect(
        daoRegistryProxy.address,
        deployOwnerWallet,
      );

    await daoRegistryInstance.initialize(
      managingDaoInstance.address,
      daoRegistrarInstance.address,
    );

    // Plugin Repo Registry
    const pluginRepoRegistryFactory = new aragonContracts
      .PluginRepoRegistry__factory();
    const pluginRepoRegistry = await pluginRepoRegistryFactory
      .connect(deployOwnerWallet)
      .deploy();
    const pluginRepoRegistryProxy = await proxyFactory.deploy(
      pluginRepoRegistry.address,
      "0x",
    );
    const pluginRepoRegistryInstance = aragonContracts
      .PluginRepoRegistry__factory.connect(
        pluginRepoRegistryProxy.address,
        deployOwnerWallet,
      );

    await pluginRepoRegistryInstance.initialize(
      managingDaoInstance.address,
      pluginRegistrarInstance.address,
    );

    // Plugin Repo Factory
    const pluginRepoFactoryFactory = new aragonContracts
      .PluginRepoFactory__factory();
    const pluginRepoFactory = await pluginRepoFactoryFactory
      .connect(deployOwnerWallet)
      .deploy(pluginRepoRegistryInstance.address);

    // Plugin Setup Prcessor
    const pluginSetupProcessorFacotry = new aragonContracts
      .PluginSetupProcessor__factory();
    const pluginSetupProcessor = await pluginSetupProcessorFacotry
      .connect(deployOwnerWallet)
      .deploy(pluginRepoRegistryInstance.address);

    // DAO Factory
    const daoFactoryfactory = new aragonContracts.DAOFactory__factory();
    const daoFactory = await daoFactoryfactory.connect(deployOwnerWallet)
      .deploy(
        daoRegistryInstance.address,
        pluginSetupProcessor.address,
      );

    // Permissions
    // ENS DAO
    await managingDaoInstance.grant(
      daoRegistrarInstance.address,
      daoRegistryInstance.address,
      id("REGISTER_ENS_SUBDOMAIN_PERMISSION"),
    );
    // ENS Plugin
    await managingDaoInstance.grant(
      pluginRegistrarInstance.address,
      pluginRepoRegistryInstance.address,
      id("REGISTER_ENS_SUBDOMAIN_PERMISSION"),
    );
    // DAO Registry
    await managingDaoInstance.grant(
      daoRegistryInstance.address,
      daoFactory.address,
      id("REGISTER_DAO_PERMISSION"),
    );
    // Plugin Registry
    await managingDaoInstance.grant(
      pluginRepoRegistryInstance.address,
      pluginRepoFactory.address,
      id("REGISTER_PLUGIN_REPO_PERMISSION"),
    );

    // Token Voting Plugin
    const tokenVotingSetupFactory = new aragonContracts
      .TokenVotingSetup__factory();
    const tokenVotingPluginSetup = await tokenVotingSetupFactory
      .connect(deployOwnerWallet)
      .deploy();

    const tokenRepoAddress = await deployPlugin(
      "token-voting",
      tokenVotingPluginSetup.address,
      await deployOwnerWallet.getAddress(),
      pluginRepoFactory,
    );
    const tokenVotingRepo = aragonContracts.PluginRepo__factory
      .connect(tokenRepoAddress, deployOwnerWallet);

    // Addresslist Voting Plugin
    const addresslistVotingFactory = new aragonContracts
      .AddresslistVotingSetup__factory();
    const addresslistVotingPluginSetup = await addresslistVotingFactory
      .connect(deployOwnerWallet)
      .deploy();
    const addresslistVotingRepoAddress = await deployPlugin(
      "address-list-voting",
      addresslistVotingPluginSetup.address,
      await deployOwnerWallet.getAddress(),
      pluginRepoFactory,
    );
    const addresslistVotingRepo = aragonContracts.PluginRepo__factory
      .connect(addresslistVotingRepoAddress, deployOwnerWallet);

    // Multisig Voting Plugin
    const multisigFactory = new aragonContracts
      .MultisigSetup__factory();
    const multisigPluginSetup = await multisigFactory
      .connect(deployOwnerWallet)
      .deploy();
    const multisigRepoAddress = await deployPlugin(
      "multisig",
      multisigPluginSetup.address,
      await deployOwnerWallet.getAddress(),
      pluginRepoFactory,
    );
    const multisigRepo = aragonContracts.PluginRepo__factory
      .connect(multisigRepoAddress, deployOwnerWallet);

    // send ETH to hardcoded wallet in tests
    await deployOwnerWallet.sendTransaction({
      to: WALLET_ADDRESS,
      value: parseEther("50.0"),
    });
    return {
      managingDaoAddress: managingDaoInstance.address,
      daoFactory,
      daoRegistry: daoRegistryInstance,
      tokenVotingRepo,
      tokenVotingPluginSetup,
      addresslistVotingRepo,
      addresslistVotingPluginSetup,
      multisigRepo,
      multisigPluginSetup,
      pluginSetupProcessor,
      ensRegistry,
    };
  } catch (e) {
    throw e;
  }
}

async function deployPlugin(
  name: string,
  setupAddress: string,
  maintainer: string,
  pluginRepoFactory: aragonContracts.PluginRepoFactory,
  releaseMetadata: string =
    "ipfs://QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR",
  buildMetadata: string =
    "ipfs://QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR",
) {
  const address = await pluginRepoFactory.callStatic
    .createPluginRepoWithFirstVersion(
      name,
      setupAddress,
      maintainer,
      hexlify(toUtf8Bytes(releaseMetadata)),
      hexlify(toUtf8Bytes(buildMetadata)),
    );
  const tx = await pluginRepoFactory.createPluginRepoWithFirstVersion(
    name,
    setupAddress,
    maintainer,
    hexlify(toUtf8Bytes(releaseMetadata)),
    hexlify(toUtf8Bytes(buildMetadata)),
  );
  await tx.wait();
  return address;
}

async function deployEnsContracts(deployOwnerWallet: Signer) {
  try {
    const registryFactory = new ContractFactory(
      ENSRegistry.abi,
      ENSRegistry.bytecode,
    );
    const publicResolverFactory = new ContractFactory(
      PublicResolver.abi,
      PublicResolver.bytecode,
    );

    const registry = await registryFactory.connect(deployOwnerWallet).deploy();
    await registry.deployed();

    const publicResolver = await publicResolverFactory
      .connect(deployOwnerWallet)
      .deploy(registry.address, AddressZero, AddressZero, AddressZero);
    await publicResolver.deployed();

    await registerEnsName(
      "",
      "eth",
      registry,
      await deployOwnerWallet.getAddress(),
      publicResolver.address,
    );
    return { ensRegistry: registry, ensResolver: publicResolver };
  } catch (e) {
    throw e;
  }
}

async function registerEnsName(
  tld: string,
  name: string,
  registry: Contract,
  owner: string,
  resolver: string,
) {
  try {
    await registry.setSubnodeRecord(
      tld !== "" ? namehash(tld) : HashZero,
      id(name),
      owner,
      resolver,
      0,
    );
  } catch (e) {
    throw e;
  }
}
