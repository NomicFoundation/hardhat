pub fn help_test_method_invocation_serde<MethodInvocation>(call: MethodInvocation)
where
    MethodInvocation:
        PartialEq + Clone + std::fmt::Debug + serde::de::DeserializeOwned + serde::Serialize,
{
    help_test_method_invocation_serde_with_expected(call.clone(), call);
}

#[allow(clippy::type_complexity)]
/// # Panics
///
/// Will panic if an assertion fails
pub fn help_test_method_invocation_serde_with_expected<MethodInvocation>(
    call: MethodInvocation,
    expected: MethodInvocation,
) where
    MethodInvocation: PartialEq + std::fmt::Debug + serde::de::DeserializeOwned + serde::Serialize,
{
    // validate that variations of MethodInvocation which have single values can
    // still be deserialized when presented with `params` as a vector rather
    // than a single value:
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

    let json = serde_json::json!(call).to_string();

    serde_json::from_str::<MethodInvocationEnumWithUntypedParams>(&json).unwrap_or_else(|_| {
        panic!("should have successfully deserialized, with params as a Vec<String>, json {json}")
    });

    let call_decoded: MethodInvocation = serde_json::from_str(&json)
        .unwrap_or_else(|_| panic!("should have successfully deserialized json {json}"));
    assert_eq!(expected, call_decoded);
}
