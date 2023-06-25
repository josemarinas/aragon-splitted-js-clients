import { Multisig__factory } from "@aragon/osx-ethers";
import { ClientCore, GasFeeEstimation } from "@aragon/sdk-client-common";
import {
  boolArrayToBitmap,
  decodeProposalId,
  SizeMismatchError,
} from "@aragon/sdk-common";

import { toUtf8Bytes } from "@ethersproject/strings";

import { IMultisigClientEstimation } from "../interfaces";
import {
  ApproveMultisigProposalParams,
  CreateMultisigProposalParams,
} from "../../types";

export class MultisigClientEstimation extends ClientCore
  implements IMultisigClientEstimation {
  /**
   * Estimates the gas fee of creating a proposal on the plugin
   *
   * @param {string} pluginAddress
   * @param {CreateMultisigProposalParams} params
   * @return {*}  {Promise<GasFeeEstimation>}
   * @memberof MultisigClientEstimation
   */
  public async createProposal(
    pluginAddress: string,
    params: CreateMultisigProposalParams,
  ): Promise<GasFeeEstimation> {
    const signer = this.web3.getConnectedSigner();

    const multisigContract = Multisig__factory.connect(
      pluginAddress,
      signer,
    );

    if (
      params.failSafeActions?.length &&
      params.failSafeActions.length !== params.actions?.length
    ) {
      throw new SizeMismatchError();
    }
    const allowFailureMap = boolArrayToBitmap(params.failSafeActions);

    const startTimestamp = params.startDate?.getTime() || 0;
    const endTimestamp = params.endDate?.getTime() || 0;

    const estimation = await multisigContract.estimateGas.createProposal(
      toUtf8Bytes(params.metadataUri),
      params.actions || [],
      allowFailureMap,
      params.approve || false,
      params.tryExecution || true,
      Math.round(startTimestamp / 1000),
      Math.round(endTimestamp / 1000),
    );
    return this.web3.getApproximateGasFee(estimation.toBigInt());
  }

  /**
   * Estimates the gas fee of approving a proposal
   *
   * @param {ApproveMultisigProposalParams} params
   * @return {*}  {Promise<GasFeeEstimation>}
   * @memberof MultisigClientEstimation
   */
  public async approveProposal(
    params: ApproveMultisigProposalParams,
  ): Promise<GasFeeEstimation> {
    const signer = this.web3.getConnectedSigner();
    const { pluginAddress, id } = decodeProposalId(
      params.proposalId,
    );

    const multisigContract = Multisig__factory.connect(
      pluginAddress,
      signer,
    );

    const estimation = await multisigContract.estimateGas.approve(
      id,
      params.tryExecution,
    );
    return this.web3.getApproximateGasFee(estimation.toBigInt());
  }
  /**
   * Estimates the gas fee of executing a proposal
   *
   * @param {string} proposalId
   * @return {*}  {Promise<GasFeeEstimation>}
   * @memberof MultisigClientEstimation
   */
  public async executeProposal(
    proposalId: string,
  ): Promise<GasFeeEstimation> {
    const signer = this.web3.getConnectedSigner();

    const { pluginAddress, id } = decodeProposalId(
      proposalId,
    );

    const multisigContract = Multisig__factory.connect(
      pluginAddress,
      signer,
    );

    const estimation = await multisigContract.estimateGas.execute(
      id,
    );
    return this.web3.getApproximateGasFee(estimation.toBigInt());
  }
}
