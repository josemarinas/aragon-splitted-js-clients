import {
  MultisigClient,
  MultisigContext,
  MultisigPluginInstallParams,
} from "../../src";
import { bytesToHex, InvalidAddressError } from "@aragon/sdk-common";
import {
  ADDRESS_ONE,
  contextParamsLocalChain,
  TEST_INVALID_ADDRESS,
} from "../constants";
import { SupportedNetworksArray } from "@aragon/sdk-client-common";

jest.spyOn(SupportedNetworksArray, "includes").mockReturnValue(true);
jest.spyOn(MultisigContext.prototype, "network", "get").mockReturnValue(
  { chainId: 5, name: "goerli" },
);

describe("Client Multisig", () => {
  beforeAll(() => {
    contextParamsLocalChain.ensRegistryAddress = ADDRESS_ONE;
  });
  describe("Action generators", () => {
    it("Should create an a Multisig install entry", async () => {
      const members: string[] = [
        "0x1234567890123456789012345678901234567890",
        "0x2345678901234567890123456789012345678901",
        "0x3456789012345678901234567890123456789012",
        "0x4567890123456789012345678901234567890123",
      ];

      const multisigIntallParams: MultisigPluginInstallParams = {
        votingSettings: {
          minApprovals: 3,
          onlyListed: true,
        },
        members,
      };
      const installPluginItemItem = MultisigClient.encoding
        .getPluginInstallItem(
          multisigIntallParams,
        );

      expect(typeof installPluginItemItem).toBe("object");
      expect(installPluginItemItem.data).toBeInstanceOf(Uint8Array);
    });

    it("Should create a Multisig client and fail to generate a addn members action with an invalid plugin address", async () => {
      const ctx = new MultisigContext(contextParamsLocalChain);
      const client = new MultisigClient(ctx);

      const members: string[] = [
        "0x1234567890123456789012345678901234567890",
        "0x2345678901234567890123456789012345678901",
        "0x3456789012345678901234567890123456789012",
        "0x4567890123456789012345678901234567890123",
      ];

      expect(() =>
        client.encoding.addAddressesAction(TEST_INVALID_ADDRESS, members)
      )
        .toThrow(new InvalidAddressError());
    });

    it("Should create a Multisig client and fail to generate an add members action with an invalid member address", async () => {
      const ctx = new MultisigContext(contextParamsLocalChain);
      const client = new MultisigClient(ctx);

      const members: string[] = [
        "0x1234567890123456789012345678901234567890",
        "0x2345678901234567890123456789012345678901",
        "0x3456789012345678901234567890123456789012",
        TEST_INVALID_ADDRESS,
      ];

      const pluginAddress = "0x1234567890123456789012345678901234567890";

      expect(() =>
        client.encoding.addAddressesAction(
          pluginAddress,
          members,
        )
      ).toThrow(new InvalidAddressError());
    });
    it("Should create a Multisig client and an add members action", async () => {
      const ctx = new MultisigContext(contextParamsLocalChain);
      const client = new MultisigClient(ctx);

      const members: string[] = [
        "0x1357924680135792468013579246801357924680",
        "0x2468013579246801357924680135792468013579",
        "0x0987654321098765432109876543210987654321",
      ];

      const pluginAddress = "0x1234567890123456789012345678901234567890";
      const action = client.encoding.addAddressesAction(
        pluginAddress,
        members,
      );
      const decodedMembers: string[] = client.decoding.addAddressesAction(
        action.data,
      );
      decodedMembers.forEach((member, index) => {
        expect(member).toBe(members[index]);
      });

      expect(typeof action).toBe("object");
      expect(action.data instanceof Uint8Array).toBe(true);
      expect(action.to).toBe(pluginAddress);
      expect(action.value.toString()).toBe("0");
      expect(bytesToHex(action.data)).toBe(
        "0x3628731c00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000003000000000000000000000000135792468013579246801357924680135792468000000000000000000000000024680135792468013579246801357924680135790000000000000000000000000987654321098765432109876543210987654321",
      );
    });
    it("Should create a Multisig client and fail to generate a remove members action with an invalid plugin address", async () => {
      const ctx = new MultisigContext(contextParamsLocalChain);
      const client = new MultisigClient(ctx);

      const members: string[] = [
        "0x1234567890123456789012345678901234567890",
        "0x2345678901234567890123456789012345678901",
        "0x3456789012345678901234567890123456789012",
        "0x4567890123456789012345678901234567890134",
      ];

      const pluginAddress = TEST_INVALID_ADDRESS;
      expect(() =>
        client.encoding.removeAddressesAction(pluginAddress, members)
      )
        .toThrow(new InvalidAddressError());
    });

    it("Should create a Multisig client and fail to generate a remove members action with an invalid member address", async () => {
      const ctx = new MultisigContext(contextParamsLocalChain);
      const client = new MultisigClient(ctx);

      const members: string[] = [
        "0x1234567890123456789012345678901234567890",
        "0x2345678901234567890123456789012345678901",
        "0x3456789012345678901234567890123456789012",
        TEST_INVALID_ADDRESS,
      ];

      const pluginAddress = "0x1234567890123456789012345678901234567890";
      expect(() =>
        client.encoding.removeAddressesAction(pluginAddress, members)
      )
        .toThrow(new InvalidAddressError());
    });
    it("Should create a Multisig client and a remove members action", async () => {
      const ctx = new MultisigContext(contextParamsLocalChain);
      const client = new MultisigClient(ctx);

      const members: string[] = [
        "0x1357924680135792468013579246801357924680",
        "0x2468013579246801357924680135792468013579",
        "0x0987654321098765432109876543210987654321",
      ];

      const pluginAddress = "0x1234567890123456789012345678901234567890";

      const action = client.encoding.removeAddressesAction(
        pluginAddress,
        members,
      );
      const decodedMembers: string[] = client.decoding.removeAddressesAction(
        action.data,
      );
      decodedMembers.forEach((member, index) => {
        expect(member).toBe(members[index]);
      });
      expect(typeof action).toBe("object");
      expect(action.data instanceof Uint8Array).toBe(true);
      expect(action.to).toBe(pluginAddress);
      expect(action.value.toString()).toBe("0");
      expect(bytesToHex(action.data)).toBe(
        "0xa84eb99900000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000003000000000000000000000000135792468013579246801357924680135792468000000000000000000000000024680135792468013579246801357924680135790000000000000000000000000987654321098765432109876543210987654321",
      );
    });
  });
});
