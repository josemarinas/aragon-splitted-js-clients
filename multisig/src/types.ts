import {
  ContextParams,
  DaoAction,
  Pagination,
  ProposalBase,
  ProposalListItemBase,
  ProposalStatus,
  VersionTag,
} from "@aragon/sdk-client-common";

export type MultisigContextParams = ContextParams & {
  // optional so we can set default values for the parameter
  myParam?: string; // add custom params
};

export type MultisigPluginInstallParams = MultisigPluginSettings;

export type MultisigPluginSettings = {
  members: string[];
  votingSettings: MultisigVotingSettings;
};

export type MultisigVotingSettings = {
  minApprovals: number;
  onlyListed: boolean;
};

/* update members */
export type UpdateAddressesParams = {
  pluginAddress: string;
  members: string[];
};
export type RemoveAddressesParams = UpdateAddressesParams;
export type AddAddressesParams = UpdateAddressesParams;

/* Create Proposal */
export type CreateMultisigProposalParams = {
  actions?: DaoAction[];
  /** For every action item, denotes whether its execution could fail
   * without aborting the whole proposal execution */
  failSafeActions?: Array<boolean>;
  metadataUri: string;
  approve?: boolean;
  tryExecution?: boolean;
  startDate?: Date;
  /** Date at which the proposal will expire if not approved */
  endDate?: Date;
};

export enum ProposalCreationSteps {
  CREATING = "creating",
  DONE = "done",
}

export type ProposalCreationStepValue =
  | { key: ProposalCreationSteps.CREATING; txHash: string }
  | { key: ProposalCreationSteps.DONE; proposalId: string };

/* Approve Proposal */
export type ApproveMultisigProposalParams = {
  proposalId: string;
  tryExecution: boolean;
};
export enum ApproveProposalStep {
  APPROVING = "approving",
  DONE = "done",
}

export type ApproveProposalStepValue =
  | { key: ApproveProposalStep.APPROVING; txHash: string }
  | { key: ApproveProposalStep.DONE };

/* Execute Proposal */
export enum ExecuteProposalStep {
  EXECUTING = "executing",
  DONE = "done",
}

export type ExecuteProposalStepValue =
  | { key: ExecuteProposalStep.EXECUTING; txHash: string }
  | { key: ExecuteProposalStep.DONE };

/* Prepare installation */
export type MultisigPluginPrepareInstallationParams = {
  daoAddressOrEns: string;
  settings: MultisigPluginSettings;
  versionTag?: VersionTag;
};

/* can approve */
export type CanApproveParams = {
  proposalId: string;
  approverAddressOrEns: string;
};

// Proposal
type MultisigProposalBase = {
  approvals: string[];
  settings: MultisigVotingSettings;
};

export type MultisigProposal = ProposalBase & MultisigProposalBase;

export type MultisigProposalListItem =
  & ProposalListItemBase
  & MultisigProposalBase;


export enum MultisigProposalSortBy {
  CREATED_AT = "createdAt",
}

export type MultisigProposalQueryParams = Pagination & {
  sortBy?: MultisigProposalSortBy;
  status?: ProposalStatus;
  daoAddressOrEns?: string;
};