import {
  SubgraphAction,
  SubgraphMultisigProposal,
  SubgraphMultisigProposalListItem,
} from "../src/internal/types";
import { MultisigContextParams } from "../src/types";
import { Wallet } from "@ethersproject/wallet";

export const ADDRESS_ONE = "0x0000000000000000000000000000000000000001";
export const ADDRESS_TWO = "0x0000000000000000000000000000000000000002";
export const ADDRESS_THREE = "0x0000000000000000000000000000000000000003";
export const TEST_WALLET_ADDRESS = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";
export const IPFS_CID = "QmQPeNsJPyVWPFDVHb77w8G42Fvo15z4bG2X8D2GhfbSXc";
export const TEST_INVALID_ADDRESS = "0x1nv4l1d_4ddr355";


export const TEST_WALLET =
  "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e";
const IPFS_API_KEY = process?.env?.IPFS_API_KEY || "";
export const TEST_PROPOSAL_ID = ADDRESS_ONE +
  "_0x0";

export const TEST_TX_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000007E47";

const ipfsEndpoints = {
  working: [
    {
      url: process?.env?.IPFS_ENDPOINT || "https://ipfs.example.com/",
      headers: {
        "X-API-KEY": IPFS_API_KEY,
      },
    },
    {
      url: "http://localhost:5001",
    },
    {
      url: "http://localhost:5002",
    },
    {
      url: "http://localhost:5003",
    },
  ],
  failing: [
    {
      url: "https://bad-url-gateway.io/",
    },
  ],
};

export const web3endpoints = {
  working: [
    "https://cloudflare-eth.com/",
  ],
  failing: ["https://bad-url-gateway.io/"],
};
const grapqhlEndpoints = {
  working: [
    {
      url:
        "https://subgraph.satsuma-prod.com/qHR2wGfc5RLi6/aragon/osx-goerli/version/v1.1.0/api",
    },
  ],
  timeout: [
    {
      url: "https://httpstat.us/504?sleep=100",
    },
    {
      url: "https://httpstat.us/504?sleep=200",
    },
    {
      url: "https://httpstat.us/504?sleep=300",
    },
  ],
  failing: [{ url: "https://bad-url-gateway.io/" }],
};

export const contextParamsMainnet: MultisigContextParams = {
  network: "mainnet",
  signer: new Wallet(TEST_WALLET),
  daoFactoryAddress: "0x0123456789012345678901234567890123456789",
  web3Providers: web3endpoints.working,
  ipfsNodes: ipfsEndpoints.working,
  graphqlNodes: grapqhlEndpoints.working,
};
export const contextParamsLocalChain: MultisigContextParams = {
  network: 31337,
  signer: new Wallet(TEST_WALLET),
  daoFactoryAddress: "0xf8065dD2dAE72D4A8e74D8BB0c8252F3A9acE7f9",
  web3Providers: ["http://localhost:8545"],
  ipfsNodes: ipfsEndpoints.working,
  graphqlNodes: grapqhlEndpoints.working,
};
export const contextParamsFailing: MultisigContextParams = {
  network: "mainnet",
  signer: new Wallet(TEST_WALLET),
  daoFactoryAddress: "0x0123456789012345678901234567890123456789",
  web3Providers: web3endpoints.failing,
  ipfsNodes: ipfsEndpoints.failing,
  graphqlNodes: grapqhlEndpoints.failing,
};

export const SUBGRAPH_ACTIONS: SubgraphAction[] = [{
  to: ADDRESS_ONE,
  value: "0",
  data: "0x",
}, {
  to: ADDRESS_TWO,
  value: "10",
  data: "0x7E47",
}];

export const SUBGRAPH_PROPOSAL_LIST_ITEM: SubgraphMultisigProposalListItem = {
  id: TEST_PROPOSAL_ID,
  dao: {
    id: ADDRESS_ONE,
    subdomain: "test",
  },
  creator: TEST_WALLET_ADDRESS,
  executed: false,
  createdAt: Math.round(Date.now() / 1000).toString(),
  startDate: Math.round(Date.now() / 1000).toString(),
  endDate: Math.round(Date.now() / 1000).toString(),
  potentiallyExecutable: false,
  metadata: `ipfs://${IPFS_CID}`,
  approvers: [{ id: ADDRESS_ONE }, { id: ADDRESS_TWO }],
  minApprovals: 5,
  plugin: {
    onlyListed: true,
    minApprovals: 5,
  },
};

export const SUBGRAPH_PROPOSAL: SubgraphMultisigProposal = {
  ...SUBGRAPH_PROPOSAL_LIST_ITEM,
  actions: SUBGRAPH_ACTIONS,
  creationBlockNumber: "40",
  executionDate: Math.round(Date.now() / 1000).toString(),
  executionBlockNumber: "50",
  executionTxHash: TEST_TX_HASH,
};
