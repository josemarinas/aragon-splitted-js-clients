import { SupportedNetworksArray } from "@aragon/sdk-client-common";
import {
  MultisigClient,
  MultisigContext,
  MultisigVotingSettings,
} from "../../src";
import { ADDRESS_ONE, contextParamsLocalChain } from "../constants";

jest.spyOn(SupportedNetworksArray, "includes").mockReturnValue(true);
jest.spyOn(MultisigContext.prototype, "network", "get").mockReturnValue(
  { chainId: 5, name: "goerli" },
);
describe("Client Multisig", () => {
  beforeAll(() => {
    contextParamsLocalChain.ensRegistryAddress = ADDRESS_ONE;
  });
  describe("Action decoders", () => {
    it("Should decode the members from an add members action", async () => {
      const ctx = new MultisigContext(contextParamsLocalChain);
      const client = new MultisigClient(ctx);

      const pluginAddress = "0x1234567890123456789012345678901234567890";
      const members: string[] = [
        "0x1357924680135792468013579246801357924680",
        "0x2468013579246801357924680135792468013579",
        "0x0987654321098765432109876543210987654321",
      ];

      const action = client.encoding.addAddressesAction(pluginAddress, members);

      const decodedMembers: string[] = client.decoding.addAddressesAction(
        action.data,
      );
      decodedMembers.forEach((member, index) => {
        expect(member).toBe(members[index]);
      });
    });
    it("Should decode the members from an remove members action", async () => {
      const ctx = new MultisigContext(contextParamsLocalChain);
      const client = new MultisigClient(ctx);

      const pluginAddress = "0x1234567890123456789012345678901234567890";
      const members: string[] = [
        "0x1357924680135792468013579246801357924680",
        "0x2468013579246801357924680135792468013579",
        "0x0987654321098765432109876543210987654321",
      ];

      const action = client.encoding.removeAddressesAction(
        pluginAddress,
        members,
      );

      const decodedMembers: string[] = client.decoding.removeAddressesAction(
        action.data,
      );
      decodedMembers.forEach((member, index) => {
        expect(member).toBe(
          members[index],
        );
      });
    });
    it("Should decode the min approvals from an update min approvals action", async () => {
      const ctx = new MultisigContext(contextParamsLocalChain);
      const client = new MultisigClient(ctx);

      const pluginAddress = "0x1234567890123456789012345678901234567890";

      const action = client.encoding.updateMultisigVotingSettings(
        pluginAddress,
        {
          minApprovals: 3,
          onlyListed: true,
        },
      );

      const decodedSettings: MultisigVotingSettings = client.decoding
        .updateMultisigVotingSettings(
          action.data,
        );
      expect(typeof decodedSettings.minApprovals).toBe("number");
      expect(decodedSettings.minApprovals).toBe(3);
      expect(typeof decodedSettings.onlyListed).toBe("boolean");
      expect(decodedSettings.onlyListed).toBe(true);
    });

    it("Should try to decode a invalid action and with the update plugin settings decoder return an error", async () => {
      const ctx = new MultisigContext(contextParamsLocalChain);
      const client = new MultisigClient(ctx);
      const data = new Uint8Array([11, 22, 22, 33, 33, 33]);

      expect(() => client.decoding.addAddressesAction(data)).toThrow(
        `data signature does not match function addAddresses. (argument=\"data\", value=\"0x0b1616212121\", code=INVALID_ARGUMENT, version=abi/5.7.0)`,
      );
    });

    it("Should get the function for a given action data", async () => {
      const ctx = new MultisigContext(contextParamsLocalChain);
      const client = new MultisigClient(ctx);

      const pluginAddress = "0x1234567890123456789012345678901234567890";

      const members: string[] = [
        "0x1357924680135792468013579246801357924680",
        "0x2468013579246801357924680135792468013579",
        "0x0987654321098765432109876543210987654321",
      ];
      const action = client.encoding.addAddressesAction(pluginAddress, members);
      const iface = client.decoding.findInterface(
        action.data,
      );
      expect(iface?.id).toBe("function addAddresses(address[])");
      expect(iface?.functionName).toBe("addAddresses");
      expect(iface?.hash).toBe("0x3628731c");
    });

    it("Should try to get the function of an invalid data and return null", async () => {
      const ctx = new MultisigContext(contextParamsLocalChain);
      const client = new MultisigClient(ctx);
      const data = new Uint8Array([11, 22, 22, 33, 33, 33]);
      const iface = client.decoding.findInterface(data);
      expect(iface).toBe(null);
    });
  });
});
