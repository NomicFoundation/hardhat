use std::sync::mpsc::{channel, Sender};

use edr_eth::{Address, Bytes};
use edr_provider::data::inspector::CallOverrideCallResult;
use napi::{
    bindgen_prelude::{BigInt, Buffer},
    Env, JsFunction, NapiRaw, Status,
};
use napi_derive::napi;

use crate::{
    cast::TryCast,
    sync::{await_promise, handle_error},
    threadsafe_function::{ThreadSafeCallContext, ThreadsafeFunction, ThreadsafeFunctionCallMode},
};

#[napi(object)]
struct CallOverrideCallResultBuffer {
    pub result: Buffer,
    pub should_revert: bool,
    pub gas: BigInt,
}

impl TryCast<Option<CallOverrideCallResult>> for Option<CallOverrideCallResultBuffer> {
    type Error = napi::Error;

    fn try_cast(self) -> Result<Option<CallOverrideCallResult>, Self::Error> {
        match self {
            None => Ok(None),
            Some(result) => Ok(Some(CallOverrideCallResult {
                result: result.result.try_cast()?,
                should_revert: result.should_revert,
                gas: result.gas.try_cast()?,
            })),
        }
    }
}

struct CallOverrideCall {
    contract_address: Address,
    data: Bytes,
    sender: Sender<napi::Result<Option<CallOverrideCallResult>>>,
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
                    Option<CallOverrideCallResultBuffer>,
                    Option<CallOverrideCallResult>,
                >(ctx.env, promise, ctx.value.sender);

                handle_error(sender, result)
            },
        )?;

        Ok(Self {
            call_override_callback_fn,
        })
    }

    // TODO take ref as argument
    pub fn call_override(
        &self,
        contract_address: Address,
        data: Bytes,
    ) -> Option<CallOverrideCallResult> {
        let (sender, receiver) = channel();

        let status = self.call_override_callback_fn.call(
            CallOverrideCall {
                contract_address,
                data,
                sender,
            },
            ThreadsafeFunctionCallMode::Blocking,
        );

        // TODO if we let third parties write callbacks we shouldn't assume they're
        // infallible.
        assert_eq!(status, Status::Ok);

        receiver
            .recv()
            .unwrap()
            .expect("Failed call to call_override_callback")
    }
}
