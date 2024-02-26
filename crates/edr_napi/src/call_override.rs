use std::sync::mpsc::{channel, Sender};

use edr_eth::{Address, Bytes};
use napi::{bindgen_prelude::Buffer, Env, JsFunction, NapiRaw, Status};
use napi_derive::napi;

use crate::{
    cast::TryCast,
    sync::{await_promise, handle_error},
    threadsafe_function::{ThreadSafeCallContext, ThreadsafeFunction, ThreadsafeFunctionCallMode},
};

/// The result of executing a call override.
#[napi(object)]
pub struct CallOverrideResult {
    pub result: Buffer,
    pub should_revert: bool,
}

impl TryCast<Option<edr_provider::CallOverrideResult>> for Option<CallOverrideResult> {
    type Error = napi::Error;

    fn try_cast(self) -> Result<Option<edr_provider::CallOverrideResult>, Self::Error> {
        match self {
            None => Ok(None),
            Some(result) => Ok(Some(edr_provider::CallOverrideResult {
                result: result.result.try_cast()?,
                should_revert: result.should_revert,
            })),
        }
    }
}

struct CallOverrideCall {
    contract_address: Address,
    data: Bytes,
    sender: Sender<napi::Result<Option<edr_provider::CallOverrideResult>>>,
}

#[derive(Clone)]
pub struct CallOverrideCallback {
    call_override_callback_fn: ThreadsafeFunction<CallOverrideCall>,
}

impl CallOverrideCallback {
    pub fn new(env: &Env, call_override_callback: JsFunction) -> napi::Result<Self> {
        let call_override_callback_fn = ThreadsafeFunction::create(
            env.raw(),
            // SAFETY: The callback is guaranteed to be valid for the lifetime of the inspector.
            unsafe { call_override_callback.raw() },
            0,
            |ctx: ThreadSafeCallContext<CallOverrideCall>| {
                let address = ctx
                    .env
                    .create_buffer_with_data(ctx.value.contract_address.to_vec())?
                    .into_raw();

                let data = ctx
                    .env
                    .create_buffer_with_data(ctx.value.data.to_vec())?
                    .into_raw();

                let sender = ctx.value.sender.clone();
                let promise = ctx.callback.call(None, &[address, data])?;
                let result = await_promise::<
                    Option<CallOverrideResult>,
                    Option<edr_provider::CallOverrideResult>,
                >(ctx.env, promise, ctx.value.sender);

                handle_error(sender, result)
            },
        )?;

        Ok(Self {
            call_override_callback_fn,
        })
    }

    pub fn call_override(
        &self,
        contract_address: Address,
        data: Bytes,
    ) -> Option<edr_provider::CallOverrideResult> {
        let (sender, receiver) = channel();

        let status = self.call_override_callback_fn.call(
            CallOverrideCall {
                contract_address,
                data,
                sender,
            },
            ThreadsafeFunctionCallMode::Blocking,
        );

        assert_eq!(status, Status::Ok, "Call override callback failed");

        receiver
            .recv()
            .unwrap()
            .expect("Failed call to call_override_callback")
    }
}
