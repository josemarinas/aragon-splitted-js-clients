import {
  DaoAction,
  getFunctionFragment,
  ProposalMetadata,
  ProposalStatus,
} from "@aragon/sdk-client-common";
import {
  getCompactProposalId,
  hexToBytes,
  InvalidProposalStatusError,
} from "@aragon/sdk-common";

import {
  SubgraphAction,
  SubgraphMultisigProposal,
  SubgraphMultisigProposalListItem,
} from "./types";
import { FAILING_PROPOSAL_AVAILABLE_FUNCTION_SIGNATURES } from "./constants";
import { MultisigProposal, MultisigProposalListItem } from "../types";

export function isFailingProposal(actions: DaoAction[] = []): boolean {
  // store the function names of the actions
  const functionNames: string[] = actions.map((action) => {
    try {
      const fragment = getFunctionFragment(
        action.data,
        FAILING_PROPOSAL_AVAILABLE_FUNCTION_SIGNATURES,
      );
      return fragment.name;
    } catch {
      return "";
    }
  }).filter((name) => name !== "");

  for (const [i, functionName] of functionNames.entries()) {
    // if I add addresses, we must update the settings after
    if (functionName === "addAddresses") {
      // if there is not an updateMultisigSettings after addAddresses then the proposal will fail
      if (
        functionNames.indexOf("updateMultisigSettings", i) === -1
      ) {
        return true;
      }
      // if I remove addresses, we must update the settings before
    } else if (functionName === "removeAddresses") {
      // if there is not an updateVotingSettings before removeAddresses then the proposal will fail
      const updateMultisigSettingsIndex = functionNames.indexOf(
        "updateMultisigSettings",
      );
      if (
        (updateMultisigSettingsIndex === -1 || updateMultisigSettingsIndex > i)
      ) {
        return true;
      }
    }
  }
  return false;
}

export function toMultisigProposal(
  proposal: SubgraphMultisigProposal,
  metadata: ProposalMetadata,
): MultisigProposal {
  const creationDate = new Date(
    parseInt(proposal.createdAt) * 1000,
  );
  const startDate = new Date(
    parseInt(proposal.startDate) * 1000,
  );
  const endDate = new Date(
    parseInt(proposal.endDate) * 1000,
  );
  const executionDate = proposal.executionDate
    ? new Date(
      parseInt(proposal.executionDate) * 1000,
    )
    : null;
  return {
    id: getCompactProposalId(proposal.id),
    dao: {
      address: proposal.dao.id,
      name: proposal.dao.subdomain,
    },
    creatorAddress: proposal.creator,
    metadata: {
      title: metadata.title,
      summary: metadata.summary,
      description: metadata.description,
      resources: metadata.resources,
      media: metadata.media,
    },
    settings: {
      onlyListed: proposal.plugin.onlyListed,
      minApprovals: proposal.minApprovals,
    },
    creationBlockNumber: parseInt(proposal.creationBlockNumber) || 0,
    creationDate,
    startDate,
    endDate,
    executionDate,
    executionBlockNumber: parseInt(proposal.executionBlockNumber) || null,
    executionTxHash: proposal.executionTxHash || null,
    actions: proposal.actions.map(
      (action: SubgraphAction): DaoAction => {
        return {
          data: hexToBytes(action.data),
          to: action.to,
          value: BigInt(action.value),
        };
      },
    ),
    status: computeProposalStatus(proposal),
    approvals: proposal.approvers.map(
      (approver) => approver.id.slice(0, 42),
    ),
  };
}
export function toMultisigProposalListItem(
  proposal: SubgraphMultisigProposalListItem,
  metadata: ProposalMetadata,
): MultisigProposalListItem {
  const startDate = new Date(
    parseInt(proposal.startDate) * 1000,
  );
  const endDate = new Date(
    parseInt(proposal.endDate) * 1000,
  );
  return {
    id: getCompactProposalId(proposal.id),
    dao: {
      address: proposal.dao.id,
      name: proposal.dao.subdomain,
    },
    creatorAddress: proposal.creator,
    metadata: {
      title: metadata.title,
      summary: metadata.summary,
    },
    approvals: proposal.approvers.map(
      (approver) => approver.id.slice(0, 42),
    ),
    settings: {
      onlyListed: proposal.plugin.onlyListed,
      minApprovals: proposal.minApprovals,
    },
    startDate,
    endDate,
    status: computeProposalStatus(proposal),
  };
}

export function computeProposalStatus(
  proposal: SubgraphMultisigProposal | SubgraphMultisigProposalListItem,
): ProposalStatus {
  const now = new Date();
  const startDate = new Date(
    parseInt(proposal.startDate) * 1000,
  );
  const endDate = new Date(parseInt(proposal.endDate) * 1000);
  if (proposal.executed) {
    return ProposalStatus.EXECUTED;
  }
  if (startDate >= now) {
    return ProposalStatus.PENDING;
  }
  if (proposal.potentiallyExecutable) {
    return ProposalStatus.SUCCEEDED;
  }
  if (endDate >= now) {
    return ProposalStatus.ACTIVE;
  }
  return ProposalStatus.DEFEATED;
}

export function computeProposalStatusFilter(
  status: ProposalStatus,
): Object {
  let where = {};
  const now = Math.round(new Date().getTime() / 1000).toString();
  switch (status) {
    case ProposalStatus.PENDING:
      where = { startDate_gte: now };
      break;
    case ProposalStatus.ACTIVE:
      where = { startDate_lt: now, endDate_gte: now, executed: false };
      break;
    case ProposalStatus.EXECUTED:
      where = { executed: true };
      break;
    case ProposalStatus.SUCCEEDED:
      where = { potentiallyExecutable: true, endDate_lt: now };
      break;
    case ProposalStatus.DEFEATED:
      where = {
        potentiallyExecutable: false,
        endDate_lt: now,
        executed: false,
      };
      break;
    default:
      throw new InvalidProposalStatusError();
  }
  return where;
}
