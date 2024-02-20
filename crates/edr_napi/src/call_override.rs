use std::sync::mpsc::{channel, Sender};

use edr_eth::Bytes;
use napi::{bindgen_prelude::Buffer, Env, JsFunction, NapiRaw, Status};

use crate::{
    sync::{await_promise, handle_error},
    threadsafe_function::{ThreadSafeCallContext, ThreadsafeFunction, ThreadsafeFunctionCallMode},
};

struct CallOverrideCall {
    original_return_data: Bytes,
    sender: Sender<napi::Result<Bytes>>,
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
                let input = ctx
                    .env
                    .create_buffer_with_data(ctx.value.original_return_data.to_vec())?
                    .into_raw();

                let sender = ctx.value.sender.clone();
                let promise = ctx.callback.call(None, &[input])?;
                let result = await_promise::<Buffer, Bytes>(ctx.env, promise, ctx.value.sender);

                handle_error(sender, result)
            },
        )?;

        Ok(Self {
            call_override_callback_fn,
        })
    }

    // TODO take ref as argument
    pub fn call_override(&self, original_return_data: Bytes) -> Bytes {
        let (sender, receiver) = channel();

        let status = self.call_override_callback_fn.call(
            CallOverrideCall {
                original_return_data,
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
