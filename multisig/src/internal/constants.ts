import { Multisig__factory } from "@aragon/osx-ethers";
import { MetadataAbiInput } from "@aragon/sdk-client-common";

// TODO
// import ABI from contracts package
export const INSTALLATION_ABI: MetadataAbiInput[] = [
  {
    internalType: "address[]",
    name: "members",
    type: "address[]",
    description: "The addresses of the initial members to be added.",
  },
  {
    components: [
      {
        internalType: "bool",
        name: "onlyListed",
        type: "bool",
        description:
          "Whether only listed addresses can create a proposal or not.",
      },
      {
        internalType: "uint16",
        name: "minApprovals",
        type: "uint16",
        description:
          "The minimal number of approvals required for a proposal to pass.",
      },
    ],
    internalType: "struct Multisig.MultisigSettings",
    name: "multisigSettings",
    type: "tuple",
    description: "The inital multisig settings.",
  },
];

const multisigInterface = Multisig__factory.createInterface();

export const AVAILABLE_FUNCTION_SIGNATURES: string[] = [
  multisigInterface.getFunction("addAddresses")
    .format("minimal"),
  multisigInterface.getFunction(
    "removeAddresses",
  ).format("minimal"),
  multisigInterface.getFunction(
    "updateMultisigSettings",
  ).format("minimal"),
];

export const FAILING_PROPOSAL_AVAILABLE_FUNCTION_SIGNATURES = [
    multisigInterface.getFunction("addAddresses")
      .format("minimal"),
    multisigInterface.getFunction(
      "removeAddresses",
    ).format("minimal"),
    multisigInterface.getFunction(
      "updateMultisigSettings",
    ).format("minimal"),
  ];
