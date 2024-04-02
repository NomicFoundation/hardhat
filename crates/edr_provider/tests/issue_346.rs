use edr_provider::{test_utils::create_test_config, NoopLogger, Provider};
use serde_json::json;
use tokio::runtime;

// https://github.com/NomicFoundation/edr/issues/346
#[tokio::test(flavor = "multi_thread")]
async fn issue_346() -> anyhow::Result<()> {
    let config = create_test_config();
    let logger = Box::new(NoopLogger);
    let subscriber = Box::new(|_event| {});
    let provider = Provider::new(runtime::Handle::current(), logger, subscriber, config)?;

    // The address has been changed from the repro in the issue to an address that
    // we have a secret key for in the test config.
    let request_hex_salt = json!({
      "method": "eth_signTypedData_v4",
      "params": [
        "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
        {
          "types": {
            "UpdateAdminThreshold": [
              {
                "name": "threshold",
                "type": "uint8"
              },
              {
                "name": "nonce",
                "type": "uint256"
              }
            ],
            "EIP712Domain": [
              {
                "name": "name",
                "type": "string"
              },
              {
                "name": "version",
                "type": "string"
              },
              {
                "name": "chainId",
                "type": "uint256"
              },
              {
                "name": "verifyingContract",
                "type": "address"
              },
              {
                "name": "salt",
                "type": "bytes32"
              }
            ]
          },
          "domain": {
            "name": "Collateral",
            "version": "2",
            "chainId": "0x7a69",
            "verifyingContract": "0xb0279db6a2f1e01fbc8483fccef0be2bc6299cc3",
            "salt": "0x54c6b2b3ad37d2ee0bf85cf73d4c147b0a1c333627a2cbf9a1bb9ecc1543fc7a"
          },
          "primaryType": "UpdateAdminThreshold",
          "message": {
            "threshold": "1",
            "nonce": "0"
          }
        }
      ]
    });

    assert!(provider
        .handle_request(serde_json::from_value(request_hex_salt)?)
        .is_ok());

    #[allow(clippy::zero_prefixed_literal)]
    let request_array_salt = json!({
      "method": "eth_signTypedData_v4",
      "params": [
        "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
        {
          "types": {
            "UpdateAdminThreshold": [
              {
                "name": "threshold",
                "type": "uint8"
              },
              {
                "name": "nonce",
                "type": "uint256"
              }
            ],
            "EIP712Domain": [
              {
                "name": "name",
                "type": "string"
              },
              {
                "name": "version",
                "type": "string"
              },
              {
                "name": "chainId",
                "type": "uint256"
              },
              {
                "name": "verifyingContract",
                "type": "address"
              },
              {
                "name": "salt",
                "type": "bytes32"
              }
            ]
          },
          "domain": {
            "name": "Collateral",
            "version": "2",
            "chainId": "0x7a69",
            "verifyingContract": "0xb0279db6a2f1e01fbc8483fccef0be2bc6299cc3",
            "salt": [84, 198, 178, 179, 73, 5, 10, 38, 1, 48, 2, 47, 1, 6, 0, 23, 0, 8, 1, 4, 9, 62, 03, 49, 61, 87, 58, 04, 1, 7, 52, 22]
          },
          "primaryType": "UpdateAdminThreshold",
          "message": {
            "threshold": "1",
            "nonce": "0"
          }
        }
      ]
    });

    assert!(provider
        .handle_request(serde_json::from_value(request_array_salt)?)
        .is_ok());

    Ok(())
}
