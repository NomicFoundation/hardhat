use edr_eth::{remote::eth, B256};
use napi::{
    bindgen_prelude::BigInt,
    threadsafe_function::{ThreadSafeCallContext, ThreadsafeFunction, ThreadsafeFunctionCallMode},
    Env, JsFunction,
};
use napi_derive::napi;

#[derive(Clone)]
pub struct SubscriberCallback {
    inner: ThreadsafeFunction<edr_provider::SubscriptionEvent>,
}

impl SubscriberCallback {
    pub fn new(env: &Env, subscription_event_callback: &JsFunction) -> napi::Result<Self> {
        let callback = env.create_threadsafe_function(
            subscription_event_callback,
            0,
            |ctx: ThreadSafeCallContext<edr_provider::SubscriptionEvent>| {
                // SubscriptionEvent
                let mut event = ctx.env.create_object()?;

                ctx.env
                    .create_bigint_from_words(false, ctx.value.filter_id.as_limbs().to_vec())
                    .and_then(|filter_id| event.set_named_property("filterId", filter_id))?;

                let result = match ctx.value.result {
                    edr_provider::SubscriptionEventData::Logs(logs) => ctx.env.to_js_value(&logs),
                    edr_provider::SubscriptionEventData::NewHeads(block) => {
                        let block = eth::Block::<B256>::from(block);
                        ctx.env.to_js_value(&block)
                    }
                    edr_provider::SubscriptionEventData::NewPendingTransactions(tx_hash) => {
                        ctx.env.to_js_value(&tx_hash)
                    }
                }?;

                event.set_named_property("result", result)?;

                Ok(vec![event])
            },
        )?;
        Ok(Self { inner: callback })
    }

    pub fn call(&self, event: edr_provider::SubscriptionEvent) {
        // This is blocking because it's important that the subscription events are
        // in-order
        self.inner
            .call(Ok(event), ThreadsafeFunctionCallMode::Blocking);
    }
}

#[napi(object)]
pub struct SubscriptionEvent {
    pub filter_id: BigInt,
    pub result: serde_json::Value,
}
