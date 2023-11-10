use std::{fmt::Debug, sync::mpsc::Sender};

use napi::{bindgen_prelude::FromNapiValue, Env, JsFunction, JsObject, JsUnknown, NapiRaw, Status};

use crate::cast::TryCast;

pub fn await_promise<I, O>(
    env: Env,
    result: JsUnknown,
    tx: Sender<napi::Result<O>>,
) -> napi::Result<()>
where
    I: FromNapiValue + TryCast<O, Error = napi::Error>,
    O: 'static,
{
    // If the result is a promise, wait for it to resolve, and send the result to
    // the channel. Otherwise, send the result immediately.
    if result.is_promise()? {
        let result: JsObject = result.try_into()?;
        let then: JsFunction = result.get_named_property("then")?;
        let tx2 = tx.clone();
        let cb = env.create_function_from_closure("callback", move |ctx| {
            let result = ctx.get::<I>(0)?;
            tx.send(Ok(result.try_cast()?)).unwrap();
            ctx.env.get_undefined()
        })?;
        let eb = env.create_function_from_closure("error_callback", move |ctx| {
            // TODO: need a way to convert a JsUnknown to an Error
            tx2.send(Err(napi::Error::from_reason("Promise rejected")))
                .unwrap();
            ctx.env.get_undefined()
        })?;
        then.call(Some(&result), &[cb, eb])?;
    } else {
        let result = unsafe { I::from_napi_value(env.raw(), result.raw())? };
        tx.send(Ok(result.try_cast()?)).unwrap();
    }

    Ok(())
}

#[allow(dead_code)]
pub fn await_void_promise(
    env: Env,
    result: JsUnknown,
    tx: Sender<napi::Result<()>>,
) -> napi::Result<()> {
    // If the result is a promise, wait for it to resolve, and send the result to
    // the channel. Otherwise, send the result immediately.
    if result.is_promise()? {
        let result: JsObject = result.try_into()?;
        let then: JsFunction = result.get_named_property("then")?;
        let tx2 = tx.clone();
        let cb = env.create_function_from_closure("callback", move |ctx| {
            tx.send(Ok(())).unwrap();
            ctx.env.get_undefined()
        })?;
        let eb = env.create_function_from_closure("error_callback", move |ctx| {
            // TODO: need a way to convert a JsUnknown to an Error
            tx2.send(Err(napi::Error::from_reason("Promise rejected")))
                .unwrap();
            ctx.env.get_undefined()
        })?;
        then.call(Some(&result), &[cb, eb])?;
        Ok(())
    } else {
        Err(napi::Error::new(
            Status::ObjectExpected,
            "Expected promise".to_owned(),
        ))
    }
}

pub fn handle_error<T: Debug>(
    tx: Sender<napi::Result<T>>,
    res: napi::Result<()>,
) -> napi::Result<()> {
    match res {
        Ok(_) => Ok(()),
        Err(e) => {
            tx.send(Err(e)).expect("send error");
            Ok(())
        }
    }
}
