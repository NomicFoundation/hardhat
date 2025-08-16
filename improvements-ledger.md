# Ledger Documentation Feedback

Overall the Ledger Developer Portal provides a solid foundation for developers working with Ledger devices, but there are several areas where the documentation could be improved to enhance developer experience. We highglighted 3 areas that could provide the most positive impact to devx.

---

## 1. TypeScript Documentation
- **Completely empty**: TS Doc pages (`Device Management Kit`, `Device Signer Kit Ethereum`) are missing.
- **Improvement idea**: Remove the links that just link back to the page itself.

---

## 2. Ethereum Signer Kit
- **Incomplete parameter/return details**: Methods like `signTransaction`, `signTypedData` lack precise type and format documentation for it parameters.
- **No error handling guidance**: Missing error codes, common failure cases (e.g., user cancel, invalid derivation path).
- **Outdated transaction support**: Unclear compatibility with Ethereum standards other than EIP-712 and EIP-7702 (eg. EIP-1559, EIP-4337).
- **Limited examples**: Basic flows only; no advanced integrations

**Example error handling improvement**
```typescript
import { executeDeviceAction } from "@ledgerhq/device-management-kit";

try {
  const response = await executeDeviceAction(device, async (transport) => {
    return transport.send(0xe0, 0x01, 0x00, 0x00); // example APDU
  });
  console.log("APDU Response:", response);
} catch (error) {
  if (error instanceof DeviceLockedError) {
    console.error("Device is locked. Please unlock and retry.");
  } else if (error instanceof UserCancelledError) {
    console.error("User rejected the action on device.");
  } else {
    console.error("Unexpected error:", error);
  }
}
```

---

## 3. Legacy vs. Modern SDKs
- **LedgerJS tutorials still featured**: Marked as deprecated but not consistently flagged.
- **No migration guides**: No clear step-by-step transition from `ledger-js` to DMK/Signer Kits.
- **Example improvement: Version-Specific Documentation**
    - Clear version badges on all code examples
    - Deprecation warnings for outdated methods
    - Side-by-side version comparison tools

**Example migration guide**
```typescript
// OLD ledger-js (deprecated)
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import Eth from "@ledgerhq/hw-app-eth";

const transport = await TransportNodeHid.create();
const eth = new Eth(transport);
const address = await eth.getAddress("44'/60'/0'/0/0");

// NEW DMK + Ethereum Signer
import { getFirstConnectedDevice } from "@ledgerhq/device-management-kit";
import { EthSigner } from "@ledgerhq/device-signers-eth";

const device = await getFirstConnectedDevice();
const signer = new EthSigner(device);
const account = await signer.getAddress("44'/60'/0'/0/0");

console.log("Migrated Address:", account.address);
```