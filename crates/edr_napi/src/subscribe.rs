#[derive(Clone, Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionEvent {
    pub filter_id: U256,
    pub result: SubscriptionEventData,
}

#[derive(Clone, Debug, serde::Serialize)]
#[serde(untagged)]
pub enum SubscriptionEventData {
    Logs(Vec<LogOutput>),
    NewHeads(eth::Block<B256>),
    NewPendingTransactions(B256),
}

impl From<edr_provider::SubscriptionEvent> for SubscriptionEvent {
    fn from(value: edr_provider::SubscriptionEvent) -> Self {
        Self {
            filter_id: value.filter_id,
            result: match value.result {
                edr_provider::SubscriptionEventData::Logs(logs) => {
                    SubscriptionEventData::Logs(logs)
                }
                edr_provider::SubscriptionEventData::NewHeads(block) => {
                    SubscriptionEventData::NewHeads(block.into())
                }
                edr_provider::SubscriptionEventData::NewPendingTransactions(tx_hash) => {
                    SubscriptionEventData::NewPendingTransactions(tx_hash)
                }
            },
        }
    }
}
