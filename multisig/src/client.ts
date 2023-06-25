import { ClientCore, PluginInstallItem } from "@aragon/sdk-client-common";
import {
  IMultisigClient,
  IMultisigClientDecoding,
  IMultisigClientEncoding,
  IMultisigClientEstimation,
  IMultisigClientMethods,
  MultisigClientDecoding,
  MultisigClientEncoding,
  MultisigClientEstimation,
  MultisigClientMethods,
} from "./internal";
import { MultisigContext } from "./context";
import { MultisigPluginInstallParams } from "./types";
import { Networkish } from "@ethersproject/providers";

export class MultisigClient extends ClientCore implements IMultisigClient {
  public methods: IMultisigClientMethods;
  public estimation: IMultisigClientEstimation;
  public encoding: IMultisigClientEncoding;
  public decoding: IMultisigClientDecoding;

  constructor(context: MultisigContext) {
    super(context);
    this.methods = new MultisigClientMethods(context);
    this.estimation = new MultisigClientEstimation(context);
    this.encoding = new MultisigClientEncoding(context);
    this.decoding = new MultisigClientDecoding(context);
  }

  static encoding = {
    /**
     * Computes the parameters to be given when creating the DAO,
     * so that the plugin is configured
     *
     * @param {MultisigPluginInstallParams} params
     * @param {Networkish} [network="mainnet"]
     * @return {*}  {PluginInstallItem}
     * @memberof MultisigClient
     */

    getPluginInstallItem: (
      params: MultisigPluginInstallParams,
      network: Networkish = "mainnet",
    ): PluginInstallItem =>
      MultisigClientEncoding.getPluginInstallItem(params, network),
  };
}
