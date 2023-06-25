import { mockedIPFSClient } from "../mocks/aragon-sdk-ipfs";
import * as mockedGraphqlRequest from "../mocks/graphql-request";
import { Server } from "ganache";
import * as ganacheSetup from "../helpers/ganache-setup";
import * as deployContracts from "../helpers/deploy-contracts";
import { mineBlock, restoreBlockTime } from "../helpers/block-times";
import {
  ContextCore,
  LIVE_CONTRACTS,
  PrepareInstallationStep,
  ProposalMetadata,
  ProposalStatus,
  SortDirection,
  SupportedNetworksArray,
} from "@aragon/sdk-client-common";
import {
  ApproveMultisigProposalParams,
  ApproveProposalStep,
  CanApproveParams,
  CreateMultisigProposalParams,
  ExecuteProposalStep,
  MultisigClient,
  MultisigContext,
  MultisigPluginPrepareInstallationParams,
  MultisigProposal,
  MultisigProposalQueryParams,
  MultisigProposalSortBy,
  ProposalCreationSteps,
} from "../../src";
import { JsonRpcProvider } from "@ethersproject/providers";
import {
  ADDRESS_ONE,
  ADDRESS_TWO,
  contextParamsLocalChain,
  SUBGRAPH_PROPOSAL,
  SUBGRAPH_PROPOSAL_LIST_ITEM,
  TEST_INVALID_ADDRESS,
  TEST_PROPOSAL_ID,
  TEST_WALLET_ADDRESS,
} from "../constants";
import { buildMultisigDAO } from "../helpers/build-daos";
import {
  QueryMultisigMembers,
  QueryMultisigProposal,
  QueryMultisigProposals,
  QueryMultisigVotingSettings,
} from "../../src/internal/graphql-queries";
import { SubgraphMultisigProposal } from "../../src/internal/types";
import {
  getExtendedProposalId,
  InvalidAddressOrEnsError,
} from "@aragon/sdk-common";

jest.spyOn(SupportedNetworksArray, "includes").mockReturnValue(true);
jest.spyOn(ContextCore.prototype, "network", "get").mockReturnValue(
  { chainId: 5, name: "goerli" },
);

describe("Client Multisig", () => {
  let deployment: deployContracts.Deployment;
  let server: Server;
  let provider: JsonRpcProvider;

  beforeAll(async () => {
    server = await ganacheSetup.start();
    deployment = await deployContracts.deploy();
    contextParamsLocalChain.daoFactoryAddress = deployment.daoFactory.address;
    contextParamsLocalChain.ensRegistryAddress = deployment.ensRegistry.address;

    if (Array.isArray(contextParamsLocalChain.web3Providers)) {
      provider = new JsonRpcProvider(
        contextParamsLocalChain.web3Providers[0] as string,
      );
    } else {
      provider = new JsonRpcProvider(
        contextParamsLocalChain.web3Providers as any,
      );
    }
    LIVE_CONTRACTS.goerli.daoFactory = deployment.daoFactory.address;
    LIVE_CONTRACTS.goerli.pluginSetupProcessor =
      deployment.pluginSetupProcessor.address;
    LIVE_CONTRACTS.goerli.multisigRepo = deployment.multisigRepo.address;
    LIVE_CONTRACTS.goerli.adminRepo = "";
    LIVE_CONTRACTS.goerli.addresslistVotingRepo =
      deployment.addresslistVotingRepo.address;
    LIVE_CONTRACTS.goerli.tokenVotingRepo = deployment.tokenVotingRepo.address;
    LIVE_CONTRACTS.goerli.multisigSetup =
      deployment.multisigPluginSetup.address;
    LIVE_CONTRACTS.goerli.adminSetup = "";
    LIVE_CONTRACTS.goerli.addresslistVotingSetup =
      deployment.addresslistVotingPluginSetup.address;
    LIVE_CONTRACTS.goerli.tokenVotingSetup =
      deployment.tokenVotingPluginSetup.address;
    await restoreBlockTime(provider);
  });

  afterAll(async () => {
    await server.close();
  });

  async function buildDao() {
    const result = await buildMultisigDAO(deployment);
    await mineBlock(provider);
    return result;
  }

  async function buildProposal(
    pluginAddress: string,
    multisigClient: MultisigClient,
  ): Promise<string> {
    // generate actions
    const action = multisigClient.encoding.updateMultisigVotingSettings(
      pluginAddress,
      {
        minApprovals: 1,
        onlyListed: true,
      },
    );

    const metadata: ProposalMetadata = {
      title: "Best Proposal",
      summary: "this is the sumnary",
      description: "This is a very long description",
      resources: [
        {
          name: "Website",
          url: "https://the.website",
        },
      ],
      media: {
        header: "https://no.media/media.jpeg",
        logo: "https://no.media/media.jpeg",
      },
    };
    const ipfsUri = await multisigClient.methods.pinMetadata(metadata);
    const endDate = new Date(Date.now() + 1000 * 60);
    const proposalParams: CreateMultisigProposalParams = {
      metadataUri: ipfsUri,
      actions: [action],
      failSafeActions: [false],
      endDate,
    };

    for await (
      const step of multisigClient.methods.createProposal(
        pluginAddress,
        proposalParams,
      )
    ) {
      switch (step.key) {
        case ProposalCreationSteps.CREATING:
          expect(typeof step.txHash).toBe("string");
          expect(step.txHash).toMatch(/^0x[A-Fa-f0-9]{64}$/i);
          break;
        case ProposalCreationSteps.DONE:
          expect(typeof step.proposalId).toBe("string");
          expect(step.proposalId).toMatch(
            /^0x[A-Fa-f0-9]{40}_0x[A-Fa-f0-9]{1,64}$/,
          );
          return step.proposalId;
        default:
          throw new Error(
            "Unexpected proposal creation step: " +
              Object.keys(step).join(", "),
          );
      }
    }
    throw new Error();
  }
  async function approveProposal(
    proposalId: string,
    client: MultisigClient,
  ) {
    const approveParams: ApproveMultisigProposalParams = {
      proposalId,
      tryExecution: false,
    };
    for await (const step of client.methods.approveProposal(approveParams)) {
      switch (step.key) {
        case ApproveProposalStep.APPROVING:
          expect(typeof step.txHash).toBe("string");
          expect(step.txHash).toMatch(/^0x[A-Fa-f0-9]{64}$/i);
          break;
        case ApproveProposalStep.DONE:
          break;
        default:
          throw new Error(
            "Unexpected approve proposal step: " +
              Object.keys(step).join(", "),
          );
      }
    }
  }

  describe("Proposal Creation", () => {
    it("Should create a new proposal locally", async () => {
      const ctx = new MultisigContext(contextParamsLocalChain);
      const multisigClient = new MultisigClient(ctx);

      const { plugin: pluginAddress } = await buildDao();

      await buildProposal(pluginAddress, multisigClient);
    });
  });

  describe("Plugin installation", () => {
    it("Should prepare the installation of a token voting plugin", async () => {
      const ctx = new MultisigContext(contextParamsLocalChain);
      const client = new MultisigClient(ctx);
      const { dao } = await buildMultisigDAO(
        deployment,
      );
      const installationParams: MultisigPluginPrepareInstallationParams = {
        settings: {
          members: [TEST_WALLET_ADDRESS],
          votingSettings: {
            minApprovals: 1,
            onlyListed: true,
          },
        },
        daoAddressOrEns: dao,
      };
      const networkSpy = jest.spyOn(JsonRpcProvider.prototype, "getNetwork");
      const defaultGetNetworkImplementation = networkSpy
        .getMockImplementation();
      networkSpy.mockImplementation(() =>
        Promise.resolve({
          name: "goerli",
          chainId: 31337,
        })
      );
      const steps = client.methods.prepareInstallation(installationParams);
      for await (const step of steps) {
        switch (step.key) {
          case PrepareInstallationStep.PREPARING:
            expect(typeof step.txHash).toBe("string");
            expect(step.txHash).toMatch(/^0x[A-Fa-f0-9]{64}$/i);
            break;
          case PrepareInstallationStep.DONE:
            expect(typeof step.pluginAddress).toBe("string");
            expect(step.pluginAddress).toMatch(/^0x[A-Fa-f0-9]{40}$/i);
            expect(typeof step.pluginRepo).toBe("string");
            expect(step.pluginRepo).toMatch(/^0x[A-Fa-f0-9]{40}$/i);
            expect(Array.isArray(step.helpers)).toBe(true);
            for (const helper of step.helpers) {
              expect(typeof helper).toBe("string");
            }
            expect(Array.isArray(step.permissions)).toBe(true);
            for (const permission of step.permissions) {
              expect(typeof permission.condition).toBe("string");
              if (permission.condition) {
                expect(permission.condition).toMatch(/^0x[A-Fa-f0-9]{40}$/i);
              }
              expect(typeof permission.operation).toBe("number");
              expect(typeof permission.where).toBe("string");
              expect(permission.where).toMatch(/^0x[A-Fa-f0-9]{40}$/i);
              expect(typeof permission.who).toBe("string");
              expect(permission.who).toMatch(/^0x[A-Fa-f0-9]{40}$/i);
            }
            expect(typeof step.versionTag.build).toBe("number");
            expect(typeof step.versionTag.release).toBe("number");
            break;
        }
      }
      networkSpy.mockImplementation(defaultGetNetworkImplementation);
    });
  });

  describe("Can approve", () => {
    it("Should check if an user can approve in a multisig instance", async () => {
      const ctx = new MultisigContext(contextParamsLocalChain);
      const client = new MultisigClient(ctx);
      // const address = await client.web3.getSigner()?.getAddress();

      const { plugin: pluginAddress } = await buildDao();

      const proposalId = await buildProposal(pluginAddress, client);
      const canApproveParams: CanApproveParams = {
        proposalId,
        approverAddressOrEns: TEST_WALLET_ADDRESS,
      };
      // positive
      let canApprove = await client.methods.canApprove(canApproveParams);
      expect(typeof canApprove).toBe("boolean");
      expect(canApprove).toBe(true);

      // negative
      canApproveParams.approverAddressOrEns =
        "0x0000000000000000000000000000000000000000";
      canApprove = await client.methods.canApprove(canApproveParams);
      expect(typeof canApprove).toBe("boolean");
      expect(canApprove).toBe(false);
    });
  });

  describe("Approve proposal", () => {
    it("Should approve a local proposal", async () => {
      const ctx = new MultisigContext(contextParamsLocalChain);
      const client = new MultisigClient(ctx);

      const { plugin: pluginAddress } = await buildDao();

      const proposalId = await buildProposal(pluginAddress, client);
      await approveProposal(proposalId, client);
    });
  });

  describe("Can execute", () => {
    it("Should check if an user can execute in a multisig instance", async () => {
      const ctx = new MultisigContext(contextParamsLocalChain);
      const client = new MultisigClient(ctx);

      const { plugin: pluginAddress } = await buildDao();

      const proposalId = await buildProposal(pluginAddress, client);
      let canExecute = await client.methods.canExecute(proposalId);
      expect(typeof canExecute).toBe("boolean");
      expect(canExecute).toBe(false);

      // now approve
      await approveProposal(proposalId, client);

      canExecute = await client.methods.canExecute(proposalId);
      expect(typeof canExecute).toBe("boolean");
      expect(canExecute).toBe(true);
    });
  });

  describe("Execute proposal", () => {
    it("Should execute a local proposal", async () => {
      const ctx = new MultisigContext(contextParamsLocalChain);
      const client = new MultisigClient(ctx);

      const { plugin: pluginAddress } = await buildDao();

      const proposalId = await buildProposal(pluginAddress, client);
      await approveProposal(proposalId, client);

      for await (
        const step of client.methods.executeProposal(
          proposalId,
        )
      ) {
        switch (step.key) {
          case ExecuteProposalStep.EXECUTING:
            expect(typeof step.txHash).toBe("string");
            expect(step.txHash).toMatch(/^0x[A-Fa-f0-9]{64}$/i);
            break;
          case ExecuteProposalStep.DONE:
            break;
          default:
            throw new Error(
              "Unexpected execute proposal step: " +
                Object.keys(step).join(", "),
            );
        }
      }
    });
  });

  describe("Data retrieval", () => {
    it("Should get the voting settings of the plugin", async () => {
      const ctx = new MultisigContext(contextParamsLocalChain);
      const client = new MultisigClient(ctx);
      const mockedClient = mockedGraphqlRequest.getMockedInstance(
        client.graphql.getClient(),
      );
      const subgraphSettings = {
        minApprovals: 5,
        onlyListed: false,
      };
      mockedClient.request.mockResolvedValueOnce({
        multisigPlugin: subgraphSettings,
      });
      const settings = await client.methods.getVotingSettings(
        ADDRESS_ONE,
      );
      expect(settings.minApprovals).toBe(
        subgraphSettings.minApprovals,
      );
      expect(settings.onlyListed).toBe(subgraphSettings.onlyListed);
      expect(mockedClient.request).toHaveBeenCalledWith(
        QueryMultisigVotingSettings,
        {
          address: ADDRESS_ONE,
        },
      );
    });

    it("Should get members of the multisig", async () => {
      const ctx = new MultisigContext(contextParamsLocalChain);
      const client = new MultisigClient(ctx);
      const mockedClient = mockedGraphqlRequest.getMockedInstance(
        client.graphql.getClient(),
      );
      const members = [ADDRESS_ONE, ADDRESS_TWO];

      mockedClient.request.mockResolvedValueOnce({
        multisigPlugin: {
          members: members.map((member) => ({ address: member })),
        },
      });

      const wallets = await client.methods.getMembers(
        ADDRESS_ONE,
        123456,
      );
      expect(wallets.length).toBe(2);
      expect(wallets).toMatchObject(members);
      expect(mockedClient.request).toHaveBeenCalledWith(QueryMultisigMembers, {
        address: ADDRESS_ONE,
        block: { number: 123456 },
      });
    });

    it("Should fetch the given proposal", async () => {
      const ctx = new MultisigContext(contextParamsLocalChain);
      const client = new MultisigClient(ctx);

      const proposalId = TEST_PROPOSAL_ID;
      const ipfsMetadata = {
        title: "Title",
        summary: "Summary",
        description: "Description",
        resources: [{
          name: "Name",
          url: "URL",
        }],
        media: [{ header: "Header", logo: "Logo" }],
      };
      mockedIPFSClient.cat.mockResolvedValue(
        Buffer.from(
          JSON.stringify(ipfsMetadata),
        ),
      );
      const mockedClient = mockedGraphqlRequest.getMockedInstance(
        client.graphql.getClient(),
      );

      const subgraphProposal: SubgraphMultisigProposal = SUBGRAPH_PROPOSAL;

      mockedClient.request.mockResolvedValueOnce({
        multisigProposal: subgraphProposal,
      });
      const proposal = await client.methods.getProposal(
        proposalId,
      ) as MultisigProposal;
      expect(proposal).not.toBe(null);

      expect(proposal.id).toBe(subgraphProposal.id);
      expect(proposal.dao.address).toBe(subgraphProposal.dao.id);
      expect(proposal.dao.name).toBe(subgraphProposal.dao.subdomain);
      expect(proposal.creatorAddress).toBe(subgraphProposal.creator);
      // check metadata
      expect(proposal.metadata.title).toBe(ipfsMetadata.title);
      expect(proposal.metadata.summary).toBe(ipfsMetadata.summary);
      expect(proposal.metadata.description).toBe(ipfsMetadata.description);
      expect(proposal.metadata.resources).toMatchObject(ipfsMetadata.resources);
      expect(proposal.metadata.media).toMatchObject(ipfsMetadata.media);

      expect(proposal.status).toBe("Defeated");
      expect(proposal.startDate instanceof Date).toBe(true);
      expect(proposal.startDate.getTime()).toBe(
        parseInt(subgraphProposal.startDate) * 1000,
      );
      expect(proposal.endDate instanceof Date).toBe(true);
      expect(proposal.endDate.getTime()).toBe(
        parseInt(subgraphProposal.endDate) * 1000,
      );
      expect(proposal.creationDate instanceof Date).toBe(true);
      expect(proposal.creationDate.getTime()).toBe(
        parseInt(subgraphProposal.createdAt) * 1000,
      );
      expect(proposal.actions).toMatchObject(proposal.actions);

      expect(proposal.executionTxHash).toMatch(
        subgraphProposal.executionTxHash,
      );
      expect(proposal.executionDate?.getTime()).toBe(
        parseInt(subgraphProposal.executionDate) * 1000,
      );
      expect(proposal.executionBlockNumber).toBe(
        parseInt(subgraphProposal.executionBlockNumber),
      );
      expect(proposal.approvals).toMatchObject(
        subgraphProposal.approvers.map((approver) => approver.id),
      );
      expect(proposal.settings.minApprovals).toBe(
        subgraphProposal.plugin.minApprovals,
      );
      expect(proposal.settings.onlyListed).toBe(
        subgraphProposal.plugin.onlyListed,
      );

      // check function call
      expect(mockedClient.request).lastCalledWith(
        QueryMultisigProposal,
        {
          proposalId: getExtendedProposalId(proposalId),
        },
      );
    });
    it("Should fetch the given proposal and fail because the proposal does not exist", async () => {
      const ctx = new MultisigContext(contextParamsLocalChain);
      const client = new MultisigClient(ctx);
      const mockedClient = mockedGraphqlRequest.getMockedInstance(
        client.graphql.getClient(),
      );
      mockedClient.request.mockResolvedValueOnce({ multisigProposal: null });
      const proposalId = TEST_PROPOSAL_ID;
      const proposal = await client.methods.getProposal(proposalId);

      expect(proposal === null).toBe(true);
    });
    it("Should get a list of proposals filtered by the given criteria", async () => {
      const ctx = new MultisigContext(contextParamsLocalChain);
      const client = new MultisigClient(ctx);
      const limit = 5;
      const params: MultisigProposalQueryParams = {
        limit,
        status: ProposalStatus.DEFEATED,
        sortBy: MultisigProposalSortBy.CREATED_AT,
        direction: SortDirection.ASC,
      };
      const ipfsMetadata = {
        title: "Title",
        summary: "Summary",
        description: "Description",
        resources: [{
          name: "Name",
          url: "URL",
        }],
        media: [{ header: "Header", logo: "Logo" }],
      };
      mockedIPFSClient.cat.mockResolvedValue(
        Buffer.from(
          JSON.stringify(ipfsMetadata),
        ),
      );

      const mockedClient = mockedGraphqlRequest.getMockedInstance(
        client.graphql.getClient(),
      );

      mockedClient.request.mockResolvedValueOnce({
        multisigProposals: [SUBGRAPH_PROPOSAL_LIST_ITEM],
      });
      const dateGetTimeSpy = jest.spyOn(Date.prototype, "getTime");
      const now = Date.now();
      const nowFilter = Math.round(now / 1000).toString();
      dateGetTimeSpy.mockReturnValueOnce(now);

      const proposals = await client.methods.getProposals(params);
      dateGetTimeSpy.mockRestore();

      expect(Array.isArray(proposals)).toBe(true);
      expect(proposals.length).toBe(1);
      expect(proposals[0].id).toBe(SUBGRAPH_PROPOSAL_LIST_ITEM.id);
      expect(proposals[0].dao.address).toBe(SUBGRAPH_PROPOSAL_LIST_ITEM.dao.id);
      expect(proposals[0].dao.name).toBe(
        SUBGRAPH_PROPOSAL_LIST_ITEM.dao.subdomain,
      );
      expect(proposals[0].creatorAddress).toBe(
        SUBGRAPH_PROPOSAL_LIST_ITEM.creator,
      );
      expect(proposals[0].metadata.title).toBe(ipfsMetadata.title);
      expect(proposals[0].metadata.summary).toBe(ipfsMetadata.summary);
      expect(proposals[0].startDate.getTime()).toBe(
        parseInt(SUBGRAPH_PROPOSAL_LIST_ITEM.startDate) * 1000,
      );
      expect(proposals[0].endDate.getTime()).toBe(
        parseInt(SUBGRAPH_PROPOSAL_LIST_ITEM.endDate) * 1000,
      );
      expect(proposals[0].status).toBe("Defeated");
      expect(proposals[0].approvals).toMatchObject([ADDRESS_ONE, ADDRESS_TWO]);
      expect(proposals[0].settings.minApprovals).toBe(5);
      expect(proposals[0].settings.onlyListed).toBe(true);

      expect(mockedClient.request).toHaveBeenCalledWith(
        QueryMultisigProposals,
        {
          where: {
            potentiallyExecutable: false,
            endDate_lt: nowFilter,
            executed: false,
          },
          skip: 0,
          limit: params.limit,
          direction: params.direction,
          sortBy: params.sortBy,
        },
      );
    });
    it("Should get a list of proposals from a specific dao", async () => {
      const ctx = new MultisigContext(contextParamsLocalChain);
      const client = new MultisigClient(ctx);
      const limit = 5;
      const address = ADDRESS_ONE;
      const params: MultisigProposalQueryParams = {
        limit,
        sortBy: MultisigProposalSortBy.CREATED_AT,
        direction: SortDirection.ASC,
        daoAddressOrEns: address,
      };
      const mockedClient = mockedGraphqlRequest.getMockedInstance(
        client.graphql.getClient(),
      );
      mockedClient.request.mockResolvedValueOnce({
        multisigProposals: [],
      });
      await client.methods.getProposals(params);
      expect(mockedClient.request).toHaveBeenCalledWith(
        QueryMultisigProposals,
        {
          where: {
            dao: address,
          },
          skip: 0,
          limit: params.limit,
          direction: params.direction,
          sortBy: params.sortBy,
        },
      );
    });
    it("Should get a list of proposals from an invalid address", async () => {
      const ctx = new MultisigContext(contextParamsLocalChain);
      const client = new MultisigClient(ctx);
      const limit = 5;
      const address = TEST_INVALID_ADDRESS;
      const params: MultisigProposalQueryParams = {
        limit,
        sortBy: MultisigProposalSortBy.CREATED_AT,
        direction: SortDirection.ASC,
        daoAddressOrEns: address,
      };
      await expect(() => client.methods.getProposals(params)).rejects.toThrow(
        new InvalidAddressOrEnsError(),
      );
    });
  });
});
