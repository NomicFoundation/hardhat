use rethnet_eth::remote::methods::ResolveUnspecifiedBlockTag;

pub fn help_test_method_invocation_serde<MethodInvocation>(call: MethodInvocation)
where
    MethodInvocation: PartialEq
        + std::fmt::Debug
        + serde::de::DeserializeOwned
        + serde::Serialize
        + ResolveUnspecifiedBlockTag,
{
    let json = serde_json::json!(call).to_string();

    // validate that variations of MethodInvocation which have single values can still be
    // deserialized when presented with `params` as a vector rather than a single value:
    #[derive(Debug, serde::Deserialize)]
    struct MethodInvocationStructWithUntypedParams {
        #[allow(dead_code)]
        method: String,
        #[allow(dead_code)]
        params: Vec<serde_json::Value>,
    }
    #[derive(Debug, serde::Deserialize)]
    #[serde(untagged)]
    enum MethodInvocationEnumWithUntypedParams {
        Eth(MethodInvocationStructWithUntypedParams),
        Hardhat(MethodInvocationStructWithUntypedParams),
    }
    serde_json::from_str::<MethodInvocationEnumWithUntypedParams>(&json).unwrap_or_else(|_| {
        panic!("should have successfully deserialized, with params as a Vec<String>, json {json}")
    });

    let call = call.resolve_unspecified_block_tag();

    let call_decoded: MethodInvocation = serde_json::from_str(&json)
        .unwrap_or_else(|_| panic!("should have successfully deserialized json {json}"));
    assert_eq!(call, call_decoded);
}
