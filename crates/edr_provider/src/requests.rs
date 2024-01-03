/// Ethereum RPC request types
pub mod eth;
/// Hardhat RPC request types
pub mod hardhat;
mod methods;
mod serde;
mod validation;

use std::fmt;

use ::serde::{
    de::{self, MapAccess, SeqAccess, Visitor},
    Deserialize, Deserializer,
};
pub use edr_eth::remote::client::Request as RpcRequest;

pub use crate::requests::methods::{MethodInvocation, OneUsizeOrTwo, U64OrUsize};

/// JSON-RPC request for the provider.
#[derive(Clone, Debug)]
pub enum ProviderRequest {
    /// A single JSON-RPC request
    Single(MethodInvocation),
    /// A batch of requests
    Batch(Vec<MethodInvocation>),
}

// Custom deserializer for `ProviderRequest` instead of using
// `#[serde(untagged)]` as the latter hides custom error messages which are
// important to propagate to users.
impl<'de> Deserialize<'de> for ProviderRequest {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct SingleOrBatchRequestVisitor;

        impl<'de> Visitor<'de> for SingleOrBatchRequestVisitor {
            type Value = ProviderRequest;

            fn expecting(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
                formatter.write_str("single or batch request")
            }

            fn visit_seq<A>(self, seq: A) -> Result<Self::Value, A::Error>
            where
                A: SeqAccess<'de>,
            {
                // Forward to deserializer of `Vec<MethodInvocation>`
                Ok(ProviderRequest::Batch(Deserialize::deserialize(
                    de::value::SeqAccessDeserializer::new(seq),
                )?))
            }

            fn visit_map<M>(self, map: M) -> Result<ProviderRequest, M::Error>
            where
                M: MapAccess<'de>,
            {
                // Forward to deserializer of `MethodInvocation`
                Ok(ProviderRequest::Single(Deserialize::deserialize(
                    de::value::MapAccessDeserializer::new(map),
                )?))
            }
        }

        deserializer.deserialize_any(SingleOrBatchRequestVisitor)
    }
}

#[cfg(test)]
mod tests {
    use anyhow::Context;

    use super::*;

    #[test]
    fn deserialize_single_request() -> anyhow::Result<()> {
        let json = r#"{
            "jsonrpc": "2.0",
            "method": "eth_getBalance",
            "params": ["0x407d73d8a49eeb85d32cf465507dd71d507100c1", "latest"],
            "id": 1
        }"#;
        let request: ProviderRequest = serde_json::from_str(json)?;
        assert!(matches!(
            request,
            ProviderRequest::Single(MethodInvocation::GetBalance(..))
        ));
        Ok(())
    }

    #[test]
    fn deserialize_batch_request() -> anyhow::Result<()> {
        let json = r#"[
            {
                "jsonrpc": "2.0",
                "method": "eth_blockNumber",
                "params": [],
                "id": 1
            },
            {
                "jsonrpc": "2.0",
                "method": "eth_getTransactionByHash",
                "params": ["0x3f07a9c83155594c000642e7d60e8a8a00038d03e9849171a05ed0e2d47acbb3"],
                "id": 2
            }
        ]"#;
        let request: ProviderRequest = serde_json::from_str(json)?;
        assert!(matches!(request, ProviderRequest::Batch(_)));
        Ok(())
    }

    #[test]
    fn deserialize_string_instead_of_request() -> anyhow::Result<()> {
        let s = "foo";
        let json = format!(r#""{s}""#);

        let result: Result<ProviderRequest, _> = serde_json::from_str(&json);

        let error_message = result.err().context("result is error")?.to_string();
        assert!(error_message.contains(s));

        Ok(())
    }
}
