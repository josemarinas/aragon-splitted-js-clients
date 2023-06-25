// aragon imports
import { Multisig__factory } from "@aragon/osx-ethers";
import {
  ClientCore,
  DaoAction,
  getNamedTypesFromMetadata,
  LIVE_CONTRACTS,
  PluginInstallItem,
  SupportedNetwork,
  SupportedNetworksArray,
} from "@aragon/sdk-client-common";
import {
  hexToBytes,
  InvalidAddressError,
  UnsupportedNetworkError,
} from "@aragon/sdk-common";

// ethers imports
import { getNetwork, Networkish } from "@ethersproject/providers";
import { defaultAbiCoder } from "@ethersproject/abi";
import { isAddress } from "@ethersproject/address";

// local imports
import { IMultisigClientEncoding } from "../interfaces";
import {
  MultisigPluginInstallParams,
  MultisigVotingSettings,
} from "../../types";
import { INSTALLATION_ABI } from "../constants";

export class MultisigClientEncoding extends ClientCore
  implements IMultisigClientEncoding {
  /**
   * Computes the parameters to be given when creating the DAO,
   * so that the plugin is configured
   *
   * @param {MultisigPluginInstallParams} params
   * @param {Networkish} network
   *
   * @return {*}  {PluginInstallItem}
   * @memberof MultisigClientEncoding
   */
  static getPluginInstallItem(
    params: MultisigPluginInstallParams,
    network: Networkish,
  ): PluginInstallItem {
    const networkName = getNetwork(network).name as SupportedNetwork;
    if (!SupportedNetworksArray.includes(networkName)) {
      throw new UnsupportedNetworkError(networkName);
    }
    const hexBytes = defaultAbiCoder.encode(
      getNamedTypesFromMetadata(INSTALLATION_ABI),
      [
        params.members,
        [
          params.votingSettings.onlyListed,
          params.votingSettings.minApprovals,
        ],
      ],
    );
    return {
      id: LIVE_CONTRACTS[networkName].multisigRepo,
      data: hexToBytes(hexBytes),
    };
  }

  /**
   * Computes the parameters to be given when creating a proposal that updates the governance configuration
   *
   * @param {string} pluginAddress
   * @param {string[]} addresses
   * @return {*}  {DaoAction}
   * @memberof MultisigClientEncoding
   */
  public addAddressesAction(
    pluginAddress: string,
    addresses: string[],
  ): DaoAction {
    // TODO yup validation
    if (!isAddress(pluginAddress)) {
      throw new InvalidAddressError();
    }
    for (const member of addresses) {
      if (!isAddress(member)) {
        throw new InvalidAddressError();
      }
    }
    const multisigInterface = Multisig__factory.createInterface();
    // get hex bytes
    const hexBytes = multisigInterface.encodeFunctionData(
      "addAddresses",
      [addresses],
    );
    return {
      to: pluginAddress,
      value: BigInt(0),
      data: hexToBytes(hexBytes),
    };
  }

  /**
   * Computes the parameters to be given when creating a proposal that adds addresses to address list
   *
   * @param {string} pluginAddress
   * @param {string[]} addresses
   * @return {*}  {DaoAction}
   * @memberof MultisigClientEncoding
   */
  public removeAddressesAction(
    pluginAddress: string,
    addresses: string[],
  ): DaoAction {
    // TODO yup validation
    if (!isAddress(pluginAddress)) {
      throw new InvalidAddressError();
    }
    for (const member of addresses) {
      if (!isAddress(member)) {
        throw new InvalidAddressError();
      }
    }
    const multisigInterface = Multisig__factory.createInterface();
    // get hex bytes
    const hexBytes = multisigInterface.encodeFunctionData(
      "removeAddresses",
      [addresses],
    );
    return {
      to: pluginAddress,
      value: BigInt(0),
      data: hexToBytes(hexBytes),
    };
  }

  /**
   * Computes the parameters to be given when creating a proposal updates multisig settings
   *
   * @param {string} pluginAddress
   * @param {MultisigVotingSettings} votingSettings
   * @return {*}  {DaoAction}
   * @memberof MultisigClientEncoding
   */
  public updateMultisigVotingSettings(
    pluginAddress: string,
    votingSettings: MultisigVotingSettings,
  ): DaoAction {
    // TODO yup validation
    if (!isAddress(pluginAddress)) {
      throw new InvalidAddressError();
    }
    const multisigInterface = Multisig__factory.createInterface();
    // get hex bytes
    const hexBytes = multisigInterface.encodeFunctionData(
      "updateMultisigSettings",
      [votingSettings],
    );
    return {
      to: pluginAddress,
      value: BigInt(0),
      data: hexToBytes(hexBytes),
    };
  }
}
