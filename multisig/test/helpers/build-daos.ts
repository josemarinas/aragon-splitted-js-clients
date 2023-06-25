import * as aragonContracts from "@aragon/osx-ethers";

import { AddressZero } from "@ethersproject/constants";
import { id } from "@ethersproject/hash";
import { defaultAbiCoder } from "@ethersproject/abi";
import { Deployment } from "./deploy-contracts";
import { TEST_WALLET_ADDRESS } from "../constants";

export async function createDAO(
  daoFactory: aragonContracts.DAOFactory,
  daoSettings: aragonContracts.DAOFactory.DAOSettingsStruct,
  pluginSettings: aragonContracts.DAOFactory.PluginSettingsStruct[],
): Promise<{ dao: string; plugin: string }> {
  const tx = await daoFactory.createDao(daoSettings, pluginSettings);
  const receipt = await tx.wait();
  const registryInterface = aragonContracts.DAORegistry__factory
    .createInterface();
  const registeredLog = receipt.logs.find(
    (log) =>
      log.topics[0] ===
        id(registryInterface.getEvent("DAORegistered").format("sighash")),
  );

  const pluginSetupProcessorInterface = aragonContracts
    .PluginSetupProcessor__factory.createInterface();
  const installedLogs = receipt.logs.filter(
    (log) =>
      log.topics[0] ===
        id(
          pluginSetupProcessorInterface
            .getEvent("InstallationApplied")
            .format("sighash"),
        ),
  );
  if (!registeredLog) {
    throw new Error("Failed to find log");
  }

  const registeredParsed = registryInterface.parseLog(registeredLog);
  return {
    dao: registeredParsed.args[0],
    plugin: installedLogs.map(
      (log) => pluginSetupProcessorInterface.parseLog(log).args[1],
    )[0],
  };
}

export async function buildMultisigDAO(
  deployment: Deployment,
) {
  try {
    const latestVersion = await deployment.multisigRepo
      ["getLatestVersion(address)"](deployment.multisigPluginSetup.address);
    return await createDAO(
      deployment.daoFactory,
      {
        metadata: "0x",
        subdomain: "test-" + Math.floor(Math.random() * 10000),
        trustedForwarder: AddressZero,
        daoURI: "ipfs://...",
      },
      [
        {
          pluginSetupRef: {
            pluginSetupRepo: deployment.multisigRepo.address,
            versionTag: latestVersion.tag,
          },
          data: defaultAbiCoder.encode(
            [
              "address[] members",
              "tuple(bool onlyListed, uint16 minApprovals)",
            ],
            [
              [TEST_WALLET_ADDRESS],
              [false, 1],
            ],
          ),
        },
      ],
    );
  } catch (e) {
    throw e;
  }
}
