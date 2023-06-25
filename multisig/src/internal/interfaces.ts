import {
  DaoAction,
  GasFeeEstimation,
  InterfaceParams,
  PrepareInstallationStepValue,
  ProposalMetadata,
} from "@aragon/sdk-client-common";
import {
  ApproveMultisigProposalParams,
  ApproveProposalStepValue,
  CanApproveParams,
  CreateMultisigProposalParams,
  ExecuteProposalStepValue,
  MultisigPluginPrepareInstallationParams,
  MultisigProposal,
  MultisigProposalListItem,
  MultisigProposalQueryParams,
  MultisigVotingSettings,
  ProposalCreationStepValue,
} from "../types";

export interface IMultisigClient {
  methods: IMultisigClientMethods;
  estimation: IMultisigClientEstimation;
  encoding: IMultisigClientEncoding;
  decoding: IMultisigClientDecoding;
}

export interface IMultisigClientMethods {
  createProposal: (
    pluginAddress: string,
    params: CreateMultisigProposalParams,
  ) => AsyncGenerator<ProposalCreationStepValue>;
  pinMetadata: (params: ProposalMetadata) => Promise<string>;
  approveProposal: (
    params: ApproveMultisigProposalParams,
  ) => AsyncGenerator<ApproveProposalStepValue>;
  executeProposal: (
    proposalId: string,
  ) => AsyncGenerator<ExecuteProposalStepValue>;
  prepareInstallation: (
    params: MultisigPluginPrepareInstallationParams,
  ) => AsyncGenerator<PrepareInstallationStepValue>;
  canApprove: (params: CanApproveParams) => Promise<boolean>;
  canExecute: (proposalId: string) => Promise<boolean>;
  getVotingSettings: (
    addressOrEns: string,
  ) => Promise<MultisigVotingSettings>;
  getMembers: (
    addressOrEns: string,
    blockNumber?: number,
  ) => Promise<string[]>;
  getProposal: (proposalId: string) => Promise<MultisigProposal | null>;
  getProposals: (
    params: MultisigProposalQueryParams,
  ) => Promise<MultisigProposalListItem[]>;
}
export interface IMultisigClientEstimation {
  createProposal: (
    pluginAddress: string,
    params: CreateMultisigProposalParams,
  ) => Promise<GasFeeEstimation>;
  approveProposal: (
    params: ApproveMultisigProposalParams,
  ) => Promise<GasFeeEstimation>;
  executeProposal: (
    proposalId: string,
  ) => Promise<GasFeeEstimation>;
}
export interface IMultisigClientEncoding {
  addAddressesAction: (pluginAddress: string, addresses: string[]) => DaoAction;
  removeAddressesAction: (
    pluginAddress: string,
    addresses: string[],
  ) => DaoAction;
  updateMultisigVotingSettings: (
    pluginAddress: string,
    settings: MultisigVotingSettings,
  ) => DaoAction;
}
export interface IMultisigClientDecoding {
  addAddressesAction: (data: Uint8Array) => string[];
  removeAddressesAction: (data: Uint8Array) => string[];
  updateMultisigVotingSettings: (data: Uint8Array) => MultisigVotingSettings;
  findInterface: (data: Uint8Array) => InterfaceParams | null;
}
