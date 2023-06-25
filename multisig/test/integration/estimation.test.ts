import { SupportedNetworksArray } from "@aragon/sdk-client-common";
import * as ganacheSetup from "../helpers/ganache-setup";
import * as deployContracts from "../helpers/deploy-contracts";
// mocks need to be at the top of the imports
import "../mocks/aragon-sdk-ipfs";
import {
  ApproveMultisigProposalParams,
  CreateMultisigProposalParams,
  MultisigClient,
  MultisigContext,
} from "../../src";
import { Server } from "ganache";
import { contextParamsLocalChain } from "../constants";
import { buildMultisigDAO } from "../helpers/build-daos";

jest.spyOn(SupportedNetworksArray, "includes").mockReturnValue(true);
jest.spyOn(MultisigContext.prototype, "network", "get").mockReturnValue(
  { chainId: 5, name: "goerli" },
);

describe("Client Multisig", () => {
  describe("Estimation module", () => {
    let pluginAddress: string;
    let server: Server;

    beforeAll(async () => {
      server = await ganacheSetup.start();
      const deployment = await deployContracts.deploy();
      contextParamsLocalChain.daoFactoryAddress = deployment.daoFactory.address;
      contextParamsLocalChain.ensRegistryAddress =
        deployment.ensRegistry.address;
      const daoCreation = await buildMultisigDAO(
        deployment,
      );
      pluginAddress = daoCreation.plugin;
      // advance to get past the voting checkpoint
    });

    afterAll(async () => {
      await server.close();
    });
    it("Should estimate the gas fees for creating a new proposal", async () => {
      const ctx = new MultisigContext(contextParamsLocalChain);
      const multisigClient = new MultisigClient(ctx);
      // generate actions
      const action = await multisigClient.encoding.updateMultisigVotingSettings(
        pluginAddress,
        {
          minApprovals: 1,
          onlyListed: true,
        },
      );
      const proposalParams: CreateMultisigProposalParams = {
        metadataUri: "ipfs://QmeJ4kRW21RRgjywi9ydvY44kfx71x2WbRq7ik5xh5zBZK",
        actions: [action],
        failSafeActions: [false],
        startDate: new Date(),
        endDate: new Date(),
      };

      const estimation = await multisigClient.estimation.createProposal(
        "0x1234567890123456789012345678901234567890",
        proposalParams,
      );

      expect(typeof estimation).toEqual("object");
      expect(typeof estimation.average).toEqual("bigint");
      expect(typeof estimation.max).toEqual("bigint");
      expect(estimation.max).toBeGreaterThan(BigInt(0));
      expect(estimation.max).toBeGreaterThan(estimation.average);
    });

    it("Should estimate the gas fees for approving a proposal", async () => {
      const ctx = new MultisigContext(contextParamsLocalChain);
      const client = new MultisigClient(ctx);

      const approveParams: ApproveMultisigProposalParams = {
        proposalId: "0x1234567890123456789012345678901234567890_0x0",
        tryExecution: true,
      };

      const estimation = await client.estimation.approveProposal(approveParams);

      expect(typeof estimation).toEqual("object");
      expect(typeof estimation.average).toEqual("bigint");
      expect(typeof estimation.max).toEqual("bigint");
      expect(estimation.max).toBeGreaterThan(BigInt(0));
      expect(estimation.max).toBeGreaterThan(estimation.average);
    });

    it("Should estimate the gas fees for executing a proposal", async () => {
      const ctx = new MultisigContext(contextParamsLocalChain);
      const client = new MultisigClient(ctx);
      const estimation = await client.estimation.executeProposal(
        "0x1234567890123456789012345678901234567890_0x0",
      );

      expect(typeof estimation).toEqual("object");
      expect(typeof estimation.average).toEqual("bigint");
      expect(typeof estimation.max).toEqual("bigint");
      expect(estimation.max).toBeGreaterThan(BigInt(0));
      expect(estimation.max).toBeGreaterThan(estimation.average);
    });
  });
});
