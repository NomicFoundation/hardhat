use std::{
    collections::{HashMap, VecDeque},
    fmt::Debug,
    io,
    path::{Path, PathBuf},
    sync::atomic::{AtomicU64, Ordering},
    thread::available_parallelism,
    time::{Duration, Instant},
};

use futures::stream::StreamExt;
pub use hyper::{http::Error as HttpError, HeaderMap};
use itertools::{izip, Itertools};
use reqwest::Client as HttpClient;
use reqwest_middleware::{ClientBuilder as HttpClientBuilder, ClientWithMiddleware};
use reqwest_retry::{policies::ExponentialBackoff, RetryTransientMiddleware};
use reqwest_tracing::TracingMiddleware;
use revm_primitives::{Bytecode, KECCAK_EMPTY};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use tokio::sync::{OnceCell, RwLock};
use uuid::Uuid;

use super::{
    eth,
    filter::{LogFilterOptions, OneOrMore},
    jsonrpc,
    request_methods::RequestMethod,
    BlockSpec, PreEip1898BlockSpec,
};
use crate::{
    block::{block_time, is_safe_block_number, IsSafeBlockNumberArgs},
    log::FilterLog,
    receipt::BlockReceipt,
    remote::{
        cacheable_method_invocation::{
            try_read_cache_key, try_write_cache_key, CacheKeyForSymbolicBlockTag,
            CacheKeyForUncheckedBlockNumber, ReadCacheKey, ResolvedSymbolicTag, WriteCacheKey,
        },
        chain_id::chain_id_from_url,
        eth::FeeHistoryResult,
        jsonrpc::Id,
    },
    reward_percentile::RewardPercentile,
    AccountInfo, Address, Bytes, B256, U256, U64,
};

const RPC_CACHE_DIR: &str = "rpc_cache";
const TMP_DIR: &str = "tmp";
// Retry parameters for rate limited requests.
const EXPONENT_BASE: u32 = 2;
const MIN_RETRY_INTERVAL: Duration = Duration::from_secs(1);
const MAX_RETRY_INTERVAL: Duration = Duration::from_secs(16);
const MAX_RETRIES: u32 = 7;

/// Specialized error types
#[derive(Debug, thiserror::Error)]
pub enum RpcClientError {
    /// The message could not be sent to the remote node
    #[error(transparent)]
    FailedToSend(reqwest_middleware::Error),

    /// The remote node failed to reply with the body of the response
    #[error("The response text was corrupted: {0}.")]
    CorruptedResponse(reqwest::Error),

    /// The server returned an error code.
    #[error("The Http server returned error status code: {0}")]
    HttpStatus(reqwest::Error),

    /// The request cannot be serialized as JSON.
    #[error(transparent)]
    InvalidJsonRequest(serde_json::Error),

    /// The server returned an invalid JSON-RPC response.
    #[error("Response '{response}' failed to parse with expected type '{expected_type}', due to error: '{error}'")]
    InvalidResponse {
        /// The response text
        response: String,
        /// The expected type of the response
        expected_type: &'static str,
        /// The parse error
        error: serde_json::Error,
    },

    /// The server returned an invalid JSON-RPC id.
    #[error("The server returned an invalid id: '{id:?}' in response: '{response}'")]
    InvalidId {
        /// The response text
        response: String,
        /// The invalid id
        id: Id,
    },

    /// Invalid URL format
    #[error(transparent)]
    InvalidUrl(#[from] url::ParseError),

    /// A response is missing from a batch request.
    #[error("Missing response for method: '{method:?}' for request id: '{id:?}' in batch request")]
    MissingResponse {
        /// The method invocation for which the response is missing.
        method: Box<RequestMethod>,
        /// The id of the request iwth the missing response
        id: Id,
        /// The response text
        response: String,
    },

    /// The JSON-RPC returned an error.
    #[error("{error}. Request: {request}")]
    JsonRpcError {
        /// The JSON-RPC error
        error: jsonrpc::Error,
        /// The request JSON
        request: String,
    },

    /// There was a problem with the local cache.
    #[error("{message} for '{cache_key}' with error: '{error}'")]
    CacheError {
        /// Description of the cache error
        message: String,
        /// The cache key for the error
        cache_key: String,
        /// The underlying error
        error: CacheError,
    },

    /// Failed to join a tokio task.
    #[error(transparent)]
    JoinError(#[from] tokio::task::JoinError),
}

/// Wrapper for IO and JSON errors specific to the cache.
#[derive(thiserror::Error, Debug)]
pub enum CacheError {
    /// An IO error
    #[error(transparent)]
    Io(#[from] io::Error),
    /// A JSON parsing error
    #[error(transparent)]
    Json(#[from] serde_json::Error),
}

/// A JSON-RPC request
#[derive(Deserialize, Serialize)]
pub struct Request<RequestMethod> {
    /// JSON-RPC version
    #[serde(rename = "jsonrpc")]
    pub version: jsonrpc::Version,
    /// the method to invoke, with its parameters
    #[serde(flatten)]
    pub method: RequestMethod,
    /// the request ID, to be correlated via the response's ID
    pub id: Id,
}

/// A client for executing RPC methods on a remote Ethereum node.
/// The client caches responses based on chain id, so it's important to not use
/// it with local nodes.
#[derive(Debug)]
pub struct RpcClient {
    url: url::Url,
    chain_id: OnceCell<u64>,
    cached_block_number: RwLock<Option<CachedBlockNumber>>,
    client: ClientWithMiddleware,
    next_id: AtomicU64,
    rpc_cache_dir: PathBuf,
    tmp_dir: PathBuf,
}

impl RpcClient {
    /// Create a new instance, given a remote node URL.
    /// The cache directory is the global EDR cache directory configured by the
    /// user.
    pub fn new(
        url: &str,
        cache_dir: PathBuf,
        headers: Option<HeaderMap>,
    ) -> Result<Self, RpcClientError> {
        let retry_policy = ExponentialBackoff::builder()
            .retry_bounds(MIN_RETRY_INTERVAL, MAX_RETRY_INTERVAL)
            .base(EXPONENT_BASE)
            .build_with_max_retries(MAX_RETRIES);

        let mut client = HttpClient::builder();
        if let Some(headers) = headers {
            client = client.default_headers(headers);
        }
        let client = client
            .build()
            .expect("Default construction nor setting default headers can cause an error");

        let client = HttpClientBuilder::new(client)
            .with(TracingMiddleware::default())
            .with(RetryTransientMiddleware::new_with_policy(retry_policy))
            .build();

        let rpc_cache_dir = cache_dir.join(RPC_CACHE_DIR);
        // We aren't using the system temporary directories as they may be on a
        // different a file system which would cause the rename call later to
        // fail.
        let tmp_dir = rpc_cache_dir.join(TMP_DIR);

        Ok(RpcClient {
            url: url.parse()?,
            chain_id: OnceCell::new(),
            cached_block_number: RwLock::new(None),
            client,
            next_id: AtomicU64::new(0),
            rpc_cache_dir: cache_dir.join(RPC_CACHE_DIR),
            tmp_dir,
        })
    }

    fn parse_response_str<T: DeserializeOwned>(response: &str) -> Result<T, RpcClientError> {
        serde_json::from_str(response).map_err(|error| RpcClientError::InvalidResponse {
            response: response.to_string(),
            expected_type: std::any::type_name::<T>(),
            error,
        })
    }

    fn extract_result<T: DeserializeOwned>(
        request: SerializedRequest,
        response: String,
    ) -> Result<T, RpcClientError> {
        let response: jsonrpc::Response<T> = Self::parse_response_str(&response)?;

        response
            .data
            .into_result()
            .map_err(|error| RpcClientError::JsonRpcError {
                error,
                request: request.to_json_string(),
            })
    }

    async fn make_cache_path(&self, cache_key: &str) -> Result<PathBuf, RpcClientError> {
        let chain_id = self.chain_id().await?;

        let host = self.url.host_str().unwrap_or("unknown-host");
        let remote = if let Some(port) = self.url.port() {
            // Include the port if it's not the default port for the protocol.
            format!("{host}_{port}")
        } else {
            host.to_string()
        };

        // We use different directories for each remote node, to avoid storing invalid
        // data in case the remote is forked chain which can happen with remotes
        // running locally.
        let directory = self.rpc_cache_dir.join(remote).join(chain_id.to_string());

        ensure_cache_directory(&directory, cache_key).await?;

        let path = Path::new(&directory).join(format!("{cache_key}.json"));
        Ok(path)
    }

    async fn read_response_from_cache(
        &self,
        cache_key: &ReadCacheKey,
    ) -> Result<Option<ResponseValue>, RpcClientError> {
        let path = self.make_cache_path(cache_key.as_ref()).await?;
        match tokio::fs::read_to_string(&path).await {
            Ok(contents) => match serde_json::from_str(&contents) {
                Ok(value) => Ok(Some(ResponseValue::Cached { value, path })),
                Err(error) => {
                    log_cache_error(
                        cache_key.as_ref(),
                        "failed to deserialize item from RPC response cache",
                        error,
                    );
                    remove_from_cache(&path).await?;
                    Ok(None)
                }
            },
            Err(error) => {
                match error.kind() {
                    io::ErrorKind::NotFound => (),
                    _ => log_cache_error(
                        cache_key.as_ref(),
                        "failed to read from RPC response cache",
                        error,
                    ),
                }
                Ok(None)
            }
        }
    }

    async fn try_from_cache(
        &self,
        cache_key: Option<&ReadCacheKey>,
    ) -> Result<Option<ResponseValue>, RpcClientError> {
        if let Some(cache_key) = cache_key {
            self.read_response_from_cache(cache_key).await
        } else {
            Ok(None)
        }
    }

    async fn maybe_cached_block_number(&self) -> Result<Option<u64>, RpcClientError> {
        let cached_block_number = { self.cached_block_number.read().await.clone() };

        if let Some(cached_block_number) = cached_block_number {
            let delta = block_time(self.chain_id().await?);
            if cached_block_number.timestamp.elapsed() < delta {
                return Ok(Some(cached_block_number.block_number));
            }
        }

        Ok(None)
    }

    /// Caches a block number for the duration of the block time of the chain.
    #[cfg_attr(feature = "tracing", tracing::instrument(level = "trace", skip(self)))]
    async fn cached_block_number(&self) -> Result<u64, RpcClientError> {
        if let Some(cached_block_number) = self.maybe_cached_block_number().await? {
            return Ok(cached_block_number);
        }

        // Caches the block number as side effect.
        self.block_number().await
    }

    #[cfg_attr(feature = "tracing", tracing::instrument(level = "trace", skip(self)))]
    async fn validate_block_number(
        &self,
        safety_checker: CacheKeyForUncheckedBlockNumber,
    ) -> Result<Option<String>, RpcClientError> {
        let chain_id = self.chain_id().await?;
        let latest_block_number = self.cached_block_number().await?;
        Ok(safety_checker.validate_block_number(chain_id, latest_block_number))
    }

    async fn resolve_block_tag<T>(
        &self,
        block_tag_resolver: CacheKeyForSymbolicBlockTag,
        result: T,
        resolve_block_number: impl Fn(T) -> Option<u64>,
    ) -> Result<Option<String>, RpcClientError> {
        if let Some(block_number) = resolve_block_number(result) {
            if let Some(resolved_cache_key) = block_tag_resolver.resolve_symbolic_tag(block_number)
            {
                return match resolved_cache_key {
                    ResolvedSymbolicTag::NeedsSafetyCheck(safety_checker) => {
                        self.validate_block_number(safety_checker).await
                    }
                    ResolvedSymbolicTag::Resolved(cache_key) => Ok(Some(cache_key)),
                };
            }
        }
        Ok(None)
    }

    async fn resolve_write_key<T>(
        &self,
        method: &RequestMethod,
        result: T,
        resolve_block_number: impl Fn(T) -> Option<u64>,
    ) -> Result<Option<String>, RpcClientError> {
        let write_cache_key = try_write_cache_key(method);

        if let Some(cache_key) = write_cache_key {
            match cache_key {
                WriteCacheKey::NeedsSafetyCheck(safety_checker) => {
                    self.validate_block_number(safety_checker).await
                }
                WriteCacheKey::NeedsBlockNumber(block_tag_resolver) => {
                    self.resolve_block_tag(block_tag_resolver, result, resolve_block_number)
                        .await
                }
                WriteCacheKey::Resolved(cache_key) => Ok(Some(cache_key)),
            }
        } else {
            Ok(None)
        }
    }

    async fn try_write_response_to_cache<T: Serialize>(
        &self,
        method: &RequestMethod,
        result: &T,
        resolve_block_number: impl Fn(&T) -> Option<u64>,
    ) -> Result<(), RpcClientError> {
        if let Some(cache_key) = self
            .resolve_write_key(method, result, resolve_block_number)
            .await?
        {
            self.write_response_to_cache(&cache_key, result).await?;
        }

        Ok(())
    }

    async fn write_response_to_cache(
        &self,
        cache_key: &str,
        result: impl Serialize,
    ) -> Result<(), RpcClientError> {
        let contents = serde_json::to_string(&result).expect(
            "result serializes successfully as it was just deserialized from a JSON string",
        );

        ensure_cache_directory(&self.tmp_dir, cache_key).await?;

        // 1. Write to a random temporary file first to avoid race conditions.
        let tmp_path = self.tmp_dir.join(Uuid::new_v4().to_string());
        match tokio::fs::write(&tmp_path, contents).await {
            Ok(_) => (),
            Err(error) => {
                log_cache_error(
                    cache_key,
                    "failed to write to tempfile for RPC response cache",
                    error,
                );
                return Ok(());
            }
        }

        // 2. Then move the temporary file to the cache path.
        // This is guaranteed to be atomic on Unix platforms.
        // There is no such guarantee on Windows, as there is no OS support for atomic
        // move before Windows 10, but Rust will drop support for earlier
        // versions of Windows in the future: <https://github.com/rust-lang/compiler-team/issues/651>. Hopefully the standard
        // library will adapt its `rename` implementation to use the new atomic move API
        // in Windows
        // 10. In any case, if a cache file is corrupted, we detect and remove it when
        //     reading it.
        let cache_path = self.make_cache_path(cache_key).await?;
        match tokio::fs::rename(&tmp_path, cache_path).await {
            Ok(_) => (),
            Err(error) => {
                log_cache_error(
                    cache_key,
                    "failed to rename temporary file for RPC response cache",
                    error,
                );
            }
        };

        // In case of many concurrent renames, files remain in the tmp dir on Windows.
        #[cfg(target_os = "windows")]
        match tokio::fs::remove_file(&tmp_path).await {
            Ok(_) => (),
            Err(error) => match error.kind() {
                io::ErrorKind::NotFound => (),
                _ => log_cache_error(
                    cache_key,
                    "failed to remove temporary file for RPC response cache",
                    error,
                ),
            },
        }

        Ok(())
    }

    async fn send_request_body(
        &self,
        request_body: &SerializedRequest,
    ) -> Result<String, RpcClientError> {
        self.client
            .post(self.url.clone())
            .body(request_body.to_json_string())
            .send()
            .await
            .map_err(RpcClientError::FailedToSend)?
            .error_for_status()
            .map_err(RpcClientError::HttpStatus)?
            .text()
            .await
            .map_err(RpcClientError::CorruptedResponse)
    }

    fn get_ids(&self, count: u64) -> Vec<Id> {
        let start = self.next_id.fetch_add(count, Ordering::Relaxed);
        let end = start + count;
        (start..end).map(Id::Num).collect()
    }

    fn serialize_request(
        &self,
        input: &RequestMethod,
    ) -> Result<SerializedRequest, RpcClientError> {
        let id = Id::Num(self.next_id.fetch_add(1, Ordering::Relaxed));
        Self::serialize_request_with_id(input, id)
    }

    fn serialize_request_with_id(
        method: &RequestMethod,
        id: Id,
    ) -> Result<SerializedRequest, RpcClientError> {
        let request = serde_json::to_value(Request {
            version: jsonrpc::Version::V2_0,
            id,
            method,
        })
        .map_err(RpcClientError::InvalidJsonRequest)?;

        Ok(SerializedRequest(request))
    }

    async fn call<T: DeserializeOwned + Serialize>(
        &self,
        method: RequestMethod,
    ) -> Result<T, RpcClientError> {
        self.call_with_resolver(method, |_| None).await
    }

    async fn call_with_resolver<T: DeserializeOwned + Serialize>(
        &self,
        method: RequestMethod,
        resolve_block_number: impl Fn(&T) -> Option<u64>,
    ) -> Result<T, RpcClientError> {
        let read_cache_key = try_read_cache_key(&method);

        let request = self.serialize_request(&method)?;

        if let Some(cached_response) = self.try_from_cache(read_cache_key.as_ref()).await? {
            match cached_response.parse().await {
                Ok(result) => return Ok(result),
                Err(error) => match error {
                    // In case of an invalid response from cache, we log it and continue to the
                    // remote call.
                    RpcClientError::InvalidResponse {
                        response,
                        expected_type,
                        error,
                    } => {
                        log::error!(
                            "Failed to deserialize item from RPC response cache. error: '{error}' expected type: '{expected_type}'. item: '{response}'");
                    }
                    // For other errors, return early.
                    _ => return Err(error),
                },
            }
        };

        let result: T = self
            .send_request_body(&request)
            .await
            .and_then(|response| Self::extract_result(request, response))?;

        self.try_write_response_to_cache(&method, &result, &resolve_block_number)
            .await?;

        Ok(result)
    }

    // We have two different `call` methods to avoid creating recursive async
    // functions as the cached path calls `eth_chainId` without caching.
    async fn call_without_cache<T: DeserializeOwned>(
        &self,
        method: RequestMethod,
    ) -> Result<T, RpcClientError> {
        let request = self.serialize_request(&method)?;

        self.send_request_body(&request)
            .await
            .and_then(|response| Self::extract_result(request, response))
    }

    /// Returns the results of the given method invocations.
    async fn batch_call(
        &self,
        methods: &[RequestMethod],
    ) -> Result<VecDeque<ResponseValue>, RpcClientError> {
        self.batch_call_with_resolver(methods, |_| None).await
    }

    async fn batch_call_with_resolver(
        &self,
        methods: &[RequestMethod],
        resolve_block_number: impl Fn(&serde_json::Value) -> Option<u64>,
    ) -> Result<VecDeque<ResponseValue>, RpcClientError> {
        let ids = self.get_ids(methods.len() as u64);

        let cache_keys = methods.iter().map(try_read_cache_key).collect::<Vec<_>>();

        let mut results: Vec<Option<ResponseValue>> = Vec::with_capacity(cache_keys.len());

        for cache_key in &cache_keys {
            results.push(self.try_from_cache(cache_key.as_ref()).await?);
        }

        let mut requests: Vec<SerializedRequest> = Vec::new();
        let mut id_to_index = HashMap::<&Id, usize>::new();
        for (index, (id, method, cache_response)) in izip!(&ids, methods, &results).enumerate() {
            if cache_response.is_none() {
                let request = Self::serialize_request_with_id(method, id.clone())?;
                requests.push(request);
                id_to_index.insert(id, index);
            }
        }

        let request_body = SerializedRequest(
            serde_json::to_value(&requests).map_err(RpcClientError::InvalidJsonRequest)?,
        );
        let remote_response = self.send_request_body(&request_body).await?;
        let remote_responses: Vec<jsonrpc::Response<serde_json::Value>> =
            Self::parse_response_str(&remote_response)?;

        for response in remote_responses {
            let index = id_to_index
                // Remove to make sure no duplicate ids in response
                .remove(&response.id)
                .ok_or_else(|| RpcClientError::InvalidId {
                    response: remote_response.clone(),
                    id: response.id,
                })?;

            let result =
                response
                    .data
                    .into_result()
                    .map_err(|error| RpcClientError::JsonRpcError {
                        error,
                        request: request_body.to_json_string(),
                    })?;

            self.try_write_response_to_cache(&methods[index], &result, &resolve_block_number)
                .await?;

            results[index] = Some(ResponseValue::Remote(result));
        }

        results
            .into_iter()
            .enumerate()
            .map(|(index, result)| {
                result.ok_or_else(|| RpcClientError::MissingResponse {
                    method: Box::new(methods[index].clone()),
                    id: ids[index].clone(),
                    response: remote_response.clone(),
                })
            })
            .collect()
    }

    /// Calls `eth_blockNumber` and returns the block number.
    #[cfg_attr(feature = "tracing", tracing::instrument(level = "trace", skip(self)))]
    pub async fn block_number(&self) -> Result<u64, RpcClientError> {
        let block_number = self
            .call_without_cache::<U64>(RequestMethod::BlockNumber(()))
            .await?
            .as_limbs()[0];

        {
            let mut write_guard = self.cached_block_number.write().await;
            *write_guard = Some(CachedBlockNumber::new(block_number));
        }
        Ok(block_number)
    }

    /// Whether the block number should be cached based on its depth.
    #[cfg_attr(feature = "tracing", tracing::instrument(level = "trace", skip(self)))]
    pub async fn is_cacheable_block_number(
        &self,
        block_number: u64,
    ) -> Result<bool, RpcClientError> {
        let chain_id = self.chain_id().await?;
        let latest_block_number = self.cached_block_number().await?;

        Ok(is_safe_block_number(IsSafeBlockNumberArgs {
            chain_id,
            latest_block_number,
            block_number,
        }))
    }

    /// Calls `eth_chainId` and returns the chain ID.
    #[cfg_attr(feature = "tracing", tracing::instrument(level = "trace", skip(self)))]
    pub async fn chain_id(&self) -> Result<u64, RpcClientError> {
        let chain_id = *self
            .chain_id
            .get_or_try_init(|| async {
                if let Some(chain_id) = chain_id_from_url(&self.url) {
                    Ok(chain_id)
                } else {
                    self.call_without_cache::<U64>(RequestMethod::ChainId(()))
                        .await
                        .map(|chain_id| chain_id.as_limbs()[0])
                }
            })
            .await?;
        Ok(chain_id)
    }

    /// Calls `eth_feeHistory` and returns the fee history.
    #[cfg_attr(feature = "tracing", tracing::instrument(level = "trace", skip(self)))]
    pub async fn fee_history(
        &self,
        block_count: u64,
        newest_block: BlockSpec,
        reward_percentiles: Option<Vec<RewardPercentile>>,
    ) -> Result<FeeHistoryResult, RpcClientError> {
        self.call(RequestMethod::FeeHistory(
            U256::from(block_count),
            newest_block,
            reward_percentiles,
        ))
        .await
    }

    /// Fetch the latest block number, chain id and network id in a batch call.
    #[cfg_attr(feature = "tracing", tracing::instrument(level = "trace", skip(self)))]
    pub async fn fetch_fork_metadata(&self) -> Result<ForkMetadata, RpcClientError> {
        let mut inputs = vec![
            RequestMethod::NetVersion(()),
            RequestMethod::BlockNumber(()),
        ];

        let maybe_block_number = self.maybe_cached_block_number().await?;
        if maybe_block_number.is_none() {
            inputs.push(RequestMethod::BlockNumber(()));
        }

        // Only request the chain id if we don't have it yet.
        let mut maybe_chain_id_from_url = None;
        if !self.chain_id.initialized() {
            maybe_chain_id_from_url = chain_id_from_url(&self.url);
            if maybe_chain_id_from_url.is_none() {
                inputs.push(RequestMethod::ChainId(()));
            }
        };

        let mut results = self.batch_call(inputs.as_slice()).await?.into_iter();
        let expect = "batch call returns results for all calls on success";

        let network_id = results.next().expect(expect).parse::<U64>().await?;

        let block_number = if let Some(block_number) = maybe_block_number {
            block_number
        } else {
            let block_number = results
                .next()
                .expect(expect)
                .parse::<U64>()
                .await?
                .as_limbs()[0];
            {
                let mut write_guard = self.cached_block_number.write().await;
                *write_guard = Some(CachedBlockNumber::new(block_number));
            }
            block_number
        };

        let chain_id = *self
            .chain_id
            .get_or_try_init(|| async {
                if let Some(chain_id) = maybe_chain_id_from_url {
                    Ok(chain_id)
                } else {
                    // It's possible that the chain id was initialized in-between, but it's not
                    // possible that the chain id was initialized prior to our
                    // call, and it isn't initialized now, therefore we must've requested
                    // the chain id as well.
                    results
                        .next()
                        .expect(expect)
                        .parse::<U64>()
                        .await
                        .map(|chain_id| chain_id.as_limbs()[0])
                }
            })
            .await?;

        Ok(ForkMetadata {
            chain_id,
            network_id: network_id.as_limbs()[0],
            latest_block_number: block_number,
        })
    }

    /// Submit a consolidated batch of RPC method invocations in order to obtain
    /// the set of data contained in [`AccountInfo`].
    #[cfg_attr(feature = "tracing", tracing::instrument(level = "trace", skip(self)))]
    pub async fn get_account_info(
        &self,
        address: &Address,
        block: Option<BlockSpec>,
    ) -> Result<AccountInfo, RpcClientError> {
        Ok(self
            .get_account_infos(&[*address], block)
            .await?
            .pop()
            .expect("batch call returns as many results as inputs if there was no error"))
    }

    /// Fetch account infos for multiple addresses in a batch call.
    #[cfg_attr(feature = "tracing", tracing::instrument(level = "trace", skip(self)))]
    pub async fn get_account_infos(
        &self,
        addresses: &[Address],
        block: Option<BlockSpec>,
    ) -> Result<Vec<AccountInfo>, RpcClientError> {
        let inputs: Vec<RequestMethod> = addresses
            .iter()
            .flat_map(|address| {
                [
                    RequestMethod::GetBalance(*address, block.clone()),
                    RequestMethod::GetTransactionCount(*address, block.clone()),
                    RequestMethod::GetCode(*address, block.clone()),
                ]
            })
            .collect();

        let responses = self.batch_call(inputs.as_slice()).await?;
        let mut results = Vec::with_capacity(inputs.len() / 3);
        for (balance, nonce, code) in responses.into_iter().tuples() {
            let balance = balance.parse::<U256>().await?;
            let nonce: u64 = nonce.parse::<U256>().await?.to();
            let code = code.parse::<Bytes>().await?;
            let code = if code.is_empty() {
                None
            } else {
                Some(Bytecode::new_raw(code))
            };

            let account_info = AccountInfo {
                balance,
                code_hash: code.as_ref().map_or(KECCAK_EMPTY, Bytecode::hash_slow),
                code,
                nonce,
            };

            results.push(account_info);
        }

        Ok(results)
    }

    /// Calls `eth_getBlockByHash` and returns the transaction's hash.
    #[cfg_attr(feature = "tracing", tracing::instrument(level = "trace", skip(self)))]
    pub async fn get_block_by_hash(
        &self,
        hash: &B256,
    ) -> Result<Option<eth::Block<B256>>, RpcClientError> {
        self.call(RequestMethod::GetBlockByHash(*hash, false)).await
    }

    /// Calls `eth_getBlockByHash` and returns the transaction's data.
    #[cfg_attr(feature = "tracing", tracing::instrument(level = "trace", skip(self)))]
    pub async fn get_block_by_hash_with_transaction_data(
        &self,
        hash: &B256,
    ) -> Result<Option<eth::Block<eth::Transaction>>, RpcClientError> {
        self.call(RequestMethod::GetBlockByHash(*hash, true)).await
    }

    /// Calls `eth_getBlockByNumber` and returns the transaction's hash.
    #[cfg_attr(feature = "tracing", tracing::instrument(level = "trace", skip(self)))]
    pub async fn get_block_by_number(
        &self,
        spec: PreEip1898BlockSpec,
    ) -> Result<Option<eth::Block<B256>>, RpcClientError> {
        self.call_with_resolver(
            RequestMethod::GetBlockByNumber(spec, false),
            |block: &Option<eth::Block<B256>>| block.as_ref().and_then(|block| block.number),
        )
        .await
    }

    /// Calls `eth_getBlockByNumber` and returns the transaction's data.
    #[cfg_attr(feature = "tracing", tracing::instrument(level = "trace", skip(self)))]
    pub async fn get_block_by_number_with_transaction_data(
        &self,
        spec: PreEip1898BlockSpec,
    ) -> Result<eth::Block<eth::Transaction>, RpcClientError> {
        self.call_with_resolver(
            RequestMethod::GetBlockByNumber(spec, true),
            |block: &eth::Block<eth::Transaction>| block.number,
        )
        .await
    }

    /// Calls `eth_getLogs` using a starting and ending block (inclusive).
    #[cfg_attr(feature = "tracing", tracing::instrument(level = "trace", skip(self)))]
    pub async fn get_logs_by_range(
        &self,
        from_block: BlockSpec,
        to_block: BlockSpec,
        address: Option<OneOrMore<Address>>,
        topics: Option<Vec<Option<OneOrMore<B256>>>>,
    ) -> Result<Vec<FilterLog>, RpcClientError> {
        self.call(RequestMethod::GetLogs(LogFilterOptions {
            from_block: Some(from_block),
            to_block: Some(to_block),
            block_hash: None,
            address,
            topics,
        }))
        .await
    }

    /// Calls `eth_getTransactionByHash`.
    #[cfg_attr(feature = "tracing", tracing::instrument(level = "trace", skip(self)))]
    pub async fn get_transaction_by_hash(
        &self,
        tx_hash: &B256,
    ) -> Result<Option<eth::Transaction>, RpcClientError> {
        self.call(RequestMethod::GetTransactionByHash(*tx_hash))
            .await
    }

    /// Calls `eth_getTransactionCount`.
    #[cfg_attr(feature = "tracing", tracing::instrument(level = "trace", skip(self)))]
    pub async fn get_transaction_count(
        &self,
        address: &Address,
        block: Option<BlockSpec>,
    ) -> Result<U256, RpcClientError> {
        self.call(RequestMethod::GetTransactionCount(*address, block))
            .await
    }

    /// Calls `eth_getTransactionReceipt`.
    #[cfg_attr(feature = "tracing", tracing::instrument(level = "trace", skip(self)))]
    pub async fn get_transaction_receipt(
        &self,
        tx_hash: &B256,
    ) -> Result<Option<BlockReceipt>, RpcClientError> {
        self.call(RequestMethod::GetTransactionReceipt(*tx_hash))
            .await
    }

    /// Methods for retrieving multiple transaction receipts in one batch
    #[cfg_attr(feature = "tracing", tracing::instrument(level = "trace", skip(self)))]
    pub async fn get_transaction_receipts(
        &self,
        hashes: impl IntoIterator<Item = &B256> + Debug,
    ) -> Result<Option<Vec<BlockReceipt>>, RpcClientError> {
        let requests: Vec<RequestMethod> = hashes
            .into_iter()
            .map(|transaction_hash| RequestMethod::GetTransactionReceipt(*transaction_hash))
            .collect();

        let responses = self.batch_call(&requests).await?;

        futures::stream::iter(responses)
            .map(ResponseValue::parse)
            // Primarily CPU heavy work, only does i/o on error.
            .buffered(available_parallelism().map(usize::from).unwrap_or(1))
            .collect::<Vec<Result<Option<BlockReceipt>, RpcClientError>>>()
            .await
            .into_iter()
            .collect()
    }

    /// Calls `eth_getStorageAt`.
    #[cfg_attr(feature = "tracing", tracing::instrument(level = "trace", skip(self)))]
    pub async fn get_storage_at(
        &self,
        address: &Address,
        position: U256,
        block: Option<BlockSpec>,
    ) -> Result<Option<U256>, RpcClientError> {
        self.call(RequestMethod::GetStorageAt(*address, position, block))
            .await
    }

    /// Calls `net_version`.
    #[cfg_attr(feature = "tracing", tracing::instrument(level = "trace", skip(self)))]
    pub async fn network_id(&self) -> Result<u64, RpcClientError> {
        self.call::<U64>(RequestMethod::NetVersion(()))
            .await
            .map(|network_id| network_id.as_limbs()[0])
    }
}

async fn remove_from_cache(path: &Path) -> Result<(), RpcClientError> {
    match tokio::fs::remove_file(path).await {
        Ok(_) => Ok(()),
        Err(error) => {
            log_cache_error(
                path.to_str().unwrap_or("<invalid UTF-8>"),
                "failed to remove from RPC response cache",
                error,
            );
            Ok(())
        }
    }
}

#[derive(Debug, Clone)]
enum ResponseValue {
    Remote(serde_json::Value),
    Cached {
        value: serde_json::Value,
        path: PathBuf,
    },
}

impl ResponseValue {
    async fn parse<T: DeserializeOwned>(self) -> Result<T, RpcClientError> {
        match self {
            ResponseValue::Remote(value) => {
                serde_json::from_value(value.clone()).map_err(|error| {
                    RpcClientError::InvalidResponse {
                        response: value.to_string(),
                        expected_type: std::any::type_name::<T>(),
                        error,
                    }
                })
            }
            ResponseValue::Cached { value, path } => match serde_json::from_value(value.clone()) {
                Ok(result) => Ok(result),
                Err(error) => {
                    // Remove the file from cache if the contents don't match the expected type.
                    // This can happen for example if a new field is added to a type.
                    remove_from_cache(&path).await?;
                    Err(RpcClientError::InvalidResponse {
                        response: value.to_string(),
                        expected_type: std::any::type_name::<T>(),
                        error,
                    })
                }
            },
        }
    }
}

/// Metadata about a forked chain.
#[derive(Clone, Debug)]
pub struct ForkMetadata {
    /// Chain id as returned by `eth_chainId`
    pub chain_id: u64,
    /// Network id as returned by `net_version`
    pub network_id: u64,
    /// The latest block number as returned by `eth_blockNumber`
    pub latest_block_number: u64,
}

#[derive(Debug, Clone)]
struct CachedBlockNumber {
    block_number: u64,
    timestamp: Instant,
}

impl CachedBlockNumber {
    fn new(block_number: u64) -> Self {
        Self {
            block_number,
            timestamp: Instant::now(),
        }
    }
}

/// Don't fail the request, just log an error if we fail to read/write from
/// cache.
fn log_cache_error(cache_key: &str, message: &'static str, error: impl Into<CacheError>) {
    let cache_error = RpcClientError::CacheError {
        message: message.to_string(),
        cache_key: cache_key.to_string(),
        error: error.into(),
    };
    log::error!("{cache_error}");
}

/// Ensure that the directory exists.
async fn ensure_cache_directory(
    directory: impl AsRef<Path>,
    cache_key: impl std::fmt::Display,
) -> Result<(), RpcClientError> {
    tokio::fs::DirBuilder::new()
        .recursive(true)
        .create(directory)
        .await
        .map_err(|error| RpcClientError::CacheError {
            message: "failed to create RPC response cache directory".to_string(),
            cache_key: cache_key.to_string(),
            error: error.into(),
        })
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[repr(transparent)]
#[serde(transparent)]
struct SerializedRequest(serde_json::Value);

impl SerializedRequest {
    fn to_json_string(&self) -> String {
        self.0.to_string()
    }
}

#[cfg(test)]
mod tests {
    use std::{ops::Deref, str::FromStr};

    use reqwest::StatusCode;
    use tempfile::TempDir;

    use super::*;

    struct TestRpcClient {
        client: RpcClient,

        // Need to keep the tempdir around to prevent it from being deleted
        // Only accessed when feature = "test-remote", hence the allow.
        #[allow(dead_code)]
        cache_dir: TempDir,
    }

    impl TestRpcClient {
        fn new(url: &str) -> Self {
            let tempdir = TempDir::new().unwrap();
            Self {
                client: RpcClient::new(url, tempdir.path().into(), None).expect("url ok"),
                cache_dir: tempdir,
            }
        }
    }

    impl Deref for TestRpcClient {
        type Target = RpcClient;

        fn deref(&self) -> &Self::Target {
            &self.client
        }
    }

    #[test]
    fn get_ids_zero() {
        let client = RpcClient::new("http://localhost:8545", PathBuf::new(), None).expect("url ok");
        let ids = client.get_ids(0);
        assert!(ids.is_empty());
    }

    #[test]
    fn get_ids_more() {
        let client = RpcClient::new("http://localhost:8545", PathBuf::new(), None).expect("url ok");
        let count = 11;
        let ids = client.get_ids(count);
        assert_eq!(ids.len(), 11);
    }

    #[tokio::test]
    async fn send_request_body_400_status() {
        const STATUS_CODE: u16 = 400;

        let mut server = mockito::Server::new_async().await;

        let mock = server
            .mock("POST", "/")
            .with_status(STATUS_CODE.into())
            .with_header("content-type", "text/plain")
            .create_async()
            .await;

        let hash =
            B256::from_str("0xc008e9f9bb92057dd0035496fbf4fb54f66b4b18b370928e46d6603933022222")
                .expect("failed to parse hash from string");

        let error = TestRpcClient::new(&server.url())
            .call::<Option<eth::Transaction>>(RequestMethod::GetTransactionByHash(hash))
            .await
            .expect_err("should have failed to due to a HTTP status error");

        if let RpcClientError::HttpStatus(error) = error {
            assert_eq!(
                error.status(),
                Some(StatusCode::from_u16(STATUS_CODE).unwrap())
            );
        } else {
            unreachable!("Invalid error: {error}");
        }

        mock.assert_async().await;
    }

    #[cfg(feature = "test-remote")]
    mod alchemy {
        use std::fs::File;

        use edr_test_utils::env::get_alchemy_url;
        use futures::future::join_all;
        use walkdir::WalkDir;

        use super::*;
        use crate::Bytes;

        // The maximum block number that Alchemy allows
        const MAX_BLOCK_NUMBER: u64 = u64::MAX >> 1;

        impl TestRpcClient {
            fn files_in_cache(&self) -> Vec<PathBuf> {
                let mut files = Vec::new();
                for entry in WalkDir::new(&self.cache_dir)
                    .follow_links(true)
                    .into_iter()
                    .filter_map(Result::ok)
                {
                    if entry.file_type().is_file() {
                        files.push(entry.path().to_owned());
                    }
                }
                files
            }
        }

        #[tokio::test]
        async fn call_bad_api_key() {
            let alchemy_url = "https://eth-mainnet.g.alchemy.com/v2/abcdefg";

            let hash = B256::from_str(
                "0xc008e9f9bb92057dd0035496fbf4fb54f66b4b18b370928e46d6603933022222",
            )
            .expect("failed to parse hash from string");

            let error = TestRpcClient::new(alchemy_url)
                .call::<Option<eth::Transaction>>(RequestMethod::GetTransactionByHash(hash))
                .await
                .expect_err("should have failed to interpret response as a Transaction");

            if let RpcClientError::HttpStatus(error) = error {
                assert_eq!(error.status(), Some(StatusCode::from_u16(401).unwrap()));
            } else {
                unreachable!("Invalid error: {error}");
            }
        }

        #[tokio::test]
        async fn call_failed_to_send_error() {
            let alchemy_url = "https://xxxeth-mainnet.g.alchemy.com/";

            let hash = B256::from_str(
                "0xc008e9f9bb92057dd0035496fbf4fb54f66b4b18b370928e46d6603933051111",
            )
            .expect("failed to parse hash from string");

            let error = TestRpcClient::new(alchemy_url)
                .call::<Option<eth::Transaction>>(RequestMethod::GetTransactionByHash(hash))
                .await
                .expect_err("should have failed to connect due to a garbage domain name");

            if let RpcClientError::FailedToSend(error) = error {
                assert!(error.to_string().contains(&format!("error sending request for url ({alchemy_url}): error trying to connect: dns error: ")));
            } else {
                unreachable!("Invalid error: {error}");
            }
        }

        #[tokio::test]
        async fn test_is_cacheable_block_number() {
            let client = TestRpcClient::new(&get_alchemy_url());

            let latest_block_number = client.block_number().await.unwrap();

            {
                assert!(client.cached_block_number.read().await.is_some());
            }

            // Latest block number is never cacheable
            assert!(!client
                .is_cacheable_block_number(latest_block_number)
                .await
                .unwrap());

            assert!(client.is_cacheable_block_number(16220843).await.unwrap());
        }

        #[tokio::test]
        async fn get_account_info_works_from_cache() {
            let alchemy_url = get_alchemy_url();
            let client = TestRpcClient::new(&alchemy_url);

            let dai_address = Address::from_str("0x6b175474e89094c44da98b954eedeac495271d0f")
                .expect("failed to parse address");
            let block_spec = BlockSpec::Number(16220843);

            assert_eq!(client.files_in_cache().len(), 0);

            // Populate cache
            client
                .get_account_info(&dai_address, Some(block_spec.clone()))
                .await
                .expect("should have succeeded");

            assert_eq!(client.files_in_cache().len(), 3);

            // Returned from cache
            let account_info = client
                .get_account_info(&dai_address, Some(block_spec))
                .await
                .expect("should have succeeded");

            assert_eq!(client.files_in_cache().len(), 3);

            assert_eq!(account_info.balance, U256::ZERO);
            assert_eq!(account_info.nonce, 1);
            assert_ne!(account_info.code_hash, KECCAK_EMPTY);
            assert!(account_info.code.is_some());
        }

        #[tokio::test]
        async fn get_account_info_works_with_partial_cache() {
            let alchemy_url = get_alchemy_url();
            let client = TestRpcClient::new(&alchemy_url);

            let dai_address = Address::from_str("0x6b175474e89094c44da98b954eedeac495271d0f")
                .expect("failed to parse address");
            let block_spec = BlockSpec::Number(16220843);

            assert_eq!(client.files_in_cache().len(), 0);

            // Populate cache
            client
                .get_transaction_count(&dai_address, Some(block_spec.clone()))
                .await
                .expect("should have succeeded");

            assert_eq!(client.files_in_cache().len(), 1);

            let account_info = client
                .get_account_info(&dai_address, Some(block_spec.clone()))
                .await
                .expect("should have succeeded");

            assert_eq!(client.files_in_cache().len(), 3);

            assert_eq!(account_info.balance, U256::ZERO);
            assert_eq!(account_info.nonce, 1);
            assert_ne!(account_info.code_hash, KECCAK_EMPTY);
            assert!(account_info.code.is_some());
        }

        #[tokio::test]
        async fn get_account_info_unknown_block() {
            let alchemy_url = get_alchemy_url();

            let dai_address = Address::from_str("0x6b175474e89094c44da98b954eedeac495271d0f")
                .expect("failed to parse address");

            let error = TestRpcClient::new(&alchemy_url)
                .get_account_info(&dai_address, Some(BlockSpec::Number(MAX_BLOCK_NUMBER)))
                .await
                .expect_err("should have failed");

            if let RpcClientError::JsonRpcError { error, .. } = error {
                assert_eq!(error.code, -32602);
                assert_eq!(error.message, "Unknown block number");
                assert!(error.data.is_none());
            } else {
                unreachable!("Invalid error: {error}");
            }
        }

        #[tokio::test]
        async fn get_account_infos() {
            let alchemy_url = get_alchemy_url();

            let dai_address = Address::from_str("0x6b175474e89094c44da98b954eedeac495271d0f")
                .expect("failed to parse address");
            let hardhat_default_address =
                Address::from_str("0xbe862ad9abfe6f22bcb087716c7d89a26051f74c")
                    .expect("failed to parse address");

            let account_infos = TestRpcClient::new(&alchemy_url)
                .get_account_infos(
                    &[dai_address, hardhat_default_address],
                    Some(BlockSpec::latest()),
                )
                .await
                .expect("should have succeeded");

            assert_eq!(account_infos.len(), 2);
        }

        #[tokio::test]
        async fn get_block_by_hash_some() {
            let alchemy_url = get_alchemy_url();

            let hash = B256::from_str(
                "0x71d5e7c8ff9ea737034c16e333a75575a4a94d29482e0c2b88f0a6a8369c1812",
            )
            .expect("failed to parse hash from string");

            let block = TestRpcClient::new(&alchemy_url)
                .get_block_by_hash(&hash)
                .await
                .expect("should have succeeded");

            assert!(block.is_some());
            let block = block.unwrap();

            assert_eq!(block.hash, Some(hash));
            assert_eq!(block.transactions.len(), 192);
        }

        #[tokio::test]
        async fn get_block_by_hash_with_transaction_data_some() {
            let alchemy_url = get_alchemy_url();

            let hash = B256::from_str(
                "0x71d5e7c8ff9ea737034c16e333a75575a4a94d29482e0c2b88f0a6a8369c1812",
            )
            .expect("failed to parse hash from string");

            let block = TestRpcClient::new(&alchemy_url)
                .get_block_by_hash_with_transaction_data(&hash)
                .await
                .expect("should have succeeded");

            assert!(block.is_some());
            let block = block.unwrap();

            assert_eq!(block.hash, Some(hash));
            assert_eq!(block.transactions.len(), 192);
        }

        #[tokio::test]
        async fn get_block_by_number_finalized_resolves() {
            let alchemy_url = get_alchemy_url();
            let client = TestRpcClient::new(&alchemy_url);

            assert_eq!(client.files_in_cache().len(), 0);

            client
                .get_block_by_number(PreEip1898BlockSpec::finalized())
                .await
                .expect("should have succeeded");

            // Finalized tag should be resolved and stored in cache.
            assert_eq!(client.files_in_cache().len(), 1);
        }

        #[tokio::test]
        async fn get_block_by_number_some() {
            let alchemy_url = get_alchemy_url();

            let block_number = 16222385;

            let block = TestRpcClient::new(&alchemy_url)
                .get_block_by_number(PreEip1898BlockSpec::Number(block_number))
                .await
                .expect("should have succeeded")
                .expect("Block must exist");

            assert_eq!(block.number, Some(block_number));
            assert_eq!(block.transactions.len(), 102);
        }

        #[tokio::test]
        async fn get_block_by_number_with_transaction_data_unsafe_no_cache() {
            let alchemy_url = get_alchemy_url();
            let client = TestRpcClient::new(&alchemy_url);

            assert_eq!(client.files_in_cache().len(), 0);

            let block_number = client.block_number().await.unwrap();

            // Check that the block number call caches the largest known block number
            {
                assert!(client.cached_block_number.read().await.is_some());
            }

            assert_eq!(client.files_in_cache().len(), 0);

            let block = client
                .get_block_by_number(PreEip1898BlockSpec::Number(block_number))
                .await
                .expect("should have succeeded")
                .expect("Block must exist");

            // Unsafe block number shouldn't be cached
            assert_eq!(client.files_in_cache().len(), 0);

            assert_eq!(block.number, Some(block_number));
        }

        #[tokio::test]
        async fn get_block_with_transaction_data_cached() {
            let alchemy_url = get_alchemy_url();
            let client = TestRpcClient::new(&alchemy_url);

            let block_spec = PreEip1898BlockSpec::Number(16220843);

            assert_eq!(client.files_in_cache().len(), 0);

            let block_from_remote = client
                .get_block_by_number_with_transaction_data(block_spec.clone())
                .await
                .expect("should have from remote");

            assert_eq!(client.files_in_cache().len(), 1);

            let block_from_cache = client
                .get_block_by_number_with_transaction_data(block_spec.clone())
                .await
                .expect("should have from remote");

            assert_eq!(block_from_remote, block_from_cache);
        }

        #[tokio::test]
        async fn get_earliest_block_with_transaction_data_resolves() {
            let alchemy_url = get_alchemy_url();
            let client = TestRpcClient::new(&alchemy_url);

            assert_eq!(client.files_in_cache().len(), 0);

            client
                .get_block_by_number_with_transaction_data(PreEip1898BlockSpec::earliest())
                .await
                .expect("should have succeeded");

            // Earliest tag should be resolved to block number and it should be cached.
            assert_eq!(client.files_in_cache().len(), 1);
        }

        #[tokio::test]
        async fn get_latest_block() {
            let alchemy_url = get_alchemy_url();

            let _block = TestRpcClient::new(&alchemy_url)
                .get_block_by_number(PreEip1898BlockSpec::latest())
                .await
                .expect("should have succeeded");
        }

        #[tokio::test]
        async fn get_latest_block_with_transaction_data() {
            let alchemy_url = get_alchemy_url();

            let _block = TestRpcClient::new(&alchemy_url)
                .get_block_by_number_with_transaction_data(PreEip1898BlockSpec::latest())
                .await
                .expect("should have succeeded");
        }

        #[tokio::test]
        async fn get_pending_block() {
            let alchemy_url = get_alchemy_url();

            let _block = TestRpcClient::new(&alchemy_url)
                .get_block_by_number(PreEip1898BlockSpec::pending())
                .await
                .expect("should have succeeded");
        }

        #[tokio::test]
        async fn get_pending_block_with_transaction_data() {
            let alchemy_url = get_alchemy_url();

            let _block = TestRpcClient::new(&alchemy_url)
                .get_block_by_number_with_transaction_data(PreEip1898BlockSpec::pending())
                .await
                .expect("should have succeeded");
        }

        #[tokio::test]
        async fn get_logs_some() {
            let alchemy_url = get_alchemy_url();
            let logs = TestRpcClient::new(&alchemy_url)
                .get_logs_by_range(
                    BlockSpec::Number(10496585),
                    BlockSpec::Number(10496585),
                    Some(OneOrMore::One(
                        Address::from_str("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2")
                            .expect("failed to parse data"),
                    )),
                    None,
                )
                .await
                .expect("failed to get logs");

            assert_eq!(logs.len(), 12);
            // TODO: assert more things about the log(s)
            // TODO: consider asserting something about the logs bloom
        }

        #[tokio::test]
        async fn get_logs_future_from_block() {
            let alchemy_url = get_alchemy_url();
            let error = TestRpcClient::new(&alchemy_url)
                .get_logs_by_range(
                    BlockSpec::Number(MAX_BLOCK_NUMBER),
                    BlockSpec::Number(MAX_BLOCK_NUMBER),
                    Some(OneOrMore::One(
                        Address::from_str("0xffffffffffffffffffffffffffffffffffffffff")
                            .expect("failed to parse data"),
                    )),
                    None,
                )
                .await
                .expect_err("should have failed to get logs");

            if let RpcClientError::JsonRpcError { error, .. } = error {
                assert_eq!(error.code, -32000);
                assert_eq!(error.message, "One of the blocks specified in filter (fromBlock, toBlock or blockHash) cannot be found.");
                assert!(error.data.is_none());
            } else {
                unreachable!("Invalid error: {error}");
            }
        }

        #[tokio::test]
        async fn get_logs_future_to_block() {
            let alchemy_url = get_alchemy_url();
            let logs = TestRpcClient::new(&alchemy_url)
                .get_logs_by_range(
                    BlockSpec::Number(10496585),
                    BlockSpec::Number(MAX_BLOCK_NUMBER),
                    Some(OneOrMore::One(
                        Address::from_str("0xffffffffffffffffffffffffffffffffffffffff")
                            .expect("failed to parse data"),
                    )),
                    None,
                )
                .await
                .expect("should have succeeded");

            assert_eq!(logs, []);
        }

        #[tokio::test]
        async fn get_transaction_by_hash_some() {
            let alchemy_url = get_alchemy_url();

            let hash = B256::from_str(
                "0xc008e9f9bb92057dd0035496fbf4fb54f66b4b18b370928e46d6603933054d5a",
            )
            .expect("failed to parse hash from string");

            let tx = TestRpcClient::new(&alchemy_url)
                .get_transaction_by_hash(&hash)
                .await
                .expect("failed to get transaction by hash");

            assert!(tx.is_some());
            let tx = tx.unwrap();

            assert_eq!(
                tx.block_hash,
                Some(
                    B256::from_str(
                        "0x88fadbb673928c61b9ede3694ae0589ac77ae38ec90a24a6e12e83f42f18c7e8"
                    )
                    .expect("couldn't parse data")
                )
            );
            assert_eq!(
                tx.block_number,
                Some(U256::from_str_radix("a74fde", 16).expect("couldn't parse data"))
            );
            assert_eq!(tx.hash, hash);
            assert_eq!(
                tx.from,
                Address::from_str("0x7d97fcdb98632a91be79d3122b4eb99c0c4223ee")
                    .expect("couldn't parse data")
            );
            assert_eq!(
                tx.gas,
                U256::from_str_radix("30d40", 16).expect("couldn't parse data")
            );
            assert_eq!(
                tx.gas_price,
                U256::from_str_radix("1e449a99b8", 16).expect("couldn't parse data")
            );
            assert_eq!(
                tx.input,
                Bytes::from(hex::decode("a9059cbb000000000000000000000000e2c1e729e05f34c07d80083982ccd9154045dcc600000000000000000000000000000000000000000000000000000004a817c800").unwrap())
            );
            assert_eq!(
                tx.nonce,
                u64::from_str_radix("653b", 16).expect("couldn't parse data")
            );
            assert_eq!(
                tx.r,
                U256::from_str_radix(
                    "eb56df45bd355e182fba854506bc73737df275af5a323d30f98db13fdf44393a",
                    16
                )
                .expect("couldn't parse data")
            );
            assert_eq!(
                tx.s,
                U256::from_str_radix(
                    "2c6efcd210cdc7b3d3191360f796ca84cab25a52ed8f72efff1652adaabc1c83",
                    16
                )
                .expect("couldn't parse data")
            );
            assert_eq!(
                tx.to,
                Some(
                    Address::from_str("dac17f958d2ee523a2206206994597c13d831ec7")
                        .expect("couldn't parse data")
                )
            );
            assert_eq!(
                tx.transaction_index,
                Some(u64::from_str_radix("88", 16).expect("couldn't parse data"))
            );
            assert_eq!(
                tx.v,
                u64::from_str_radix("1c", 16).expect("couldn't parse data")
            );
            assert_eq!(
                tx.value,
                U256::from_str_radix("0", 16).expect("couldn't parse data")
            );
        }

        #[tokio::test]
        async fn get_transaction_count_some() {
            let alchemy_url = get_alchemy_url();

            let dai_address = Address::from_str("0x6b175474e89094c44da98b954eedeac495271d0f")
                .expect("failed to parse address");

            let transaction_count = TestRpcClient::new(&alchemy_url)
                .get_transaction_count(&dai_address, Some(BlockSpec::Number(16220843)))
                .await
                .expect("should have succeeded");

            assert_eq!(transaction_count, U256::from(1));
        }

        #[tokio::test]
        async fn get_transaction_count_future_block() {
            let alchemy_url = get_alchemy_url();

            let missing_address = Address::from_str("0xffffffffffffffffffffffffffffffffffffffff")
                .expect("failed to parse address");

            let error = TestRpcClient::new(&alchemy_url)
                .get_transaction_count(&missing_address, Some(BlockSpec::Number(MAX_BLOCK_NUMBER)))
                .await
                .expect_err("should have failed");

            if let RpcClientError::JsonRpcError { error, .. } = error {
                assert_eq!(error.code, -32602);
                assert_eq!(error.message, "Unknown block number");
                assert!(error.data.is_none());
            } else {
                unreachable!("Invalid error: {error}");
            }
        }

        #[tokio::test]
        async fn get_transaction_receipt_some() {
            let alchemy_url = get_alchemy_url();

            let hash = B256::from_str(
                "0xc008e9f9bb92057dd0035496fbf4fb54f66b4b18b370928e46d6603933054d5a",
            )
            .expect("failed to parse hash from string");

            let receipt = TestRpcClient::new(&alchemy_url)
                .get_transaction_receipt(&hash)
                .await
                .expect("failed to get transaction by hash");

            assert!(receipt.is_some());
            let receipt = receipt.unwrap();

            assert_eq!(
                receipt.block_hash,
                B256::from_str(
                    "0x88fadbb673928c61b9ede3694ae0589ac77ae38ec90a24a6e12e83f42f18c7e8"
                )
                .expect("couldn't parse data")
            );
            assert_eq!(receipt.block_number, 0xa74fde);
            assert_eq!(receipt.contract_address, None);
            assert_eq!(receipt.cumulative_gas_used(), 0x56c81b);
            assert_eq!(
                receipt.effective_gas_price,
                Some(U256::from_str_radix("1e449a99b8", 16).expect("couldn't parse data"))
            );
            assert_eq!(
                receipt.from,
                Address::from_str("0x7d97fcdb98632a91be79d3122b4eb99c0c4223ee")
                    .expect("couldn't parse data")
            );
            assert_eq!(
                receipt.gas_used,
                u64::from_str_radix("a0f9", 16).expect("couldn't parse data")
            );
            assert_eq!(receipt.logs().len(), 1);
            assert_eq!(receipt.state_root(), None);
            assert_eq!(receipt.status_code(), Some(1));
            assert_eq!(
                receipt.to,
                Some(
                    Address::from_str("dac17f958d2ee523a2206206994597c13d831ec7")
                        .expect("couldn't parse data")
                )
            );
            assert_eq!(receipt.transaction_hash, hash);
            assert_eq!(receipt.transaction_index, 136);
            assert_eq!(receipt.transaction_type(), 0);
        }

        #[tokio::test]
        async fn get_storage_at_some() {
            let alchemy_url = get_alchemy_url();

            let dai_address = Address::from_str("0x6b175474e89094c44da98b954eedeac495271d0f")
                .expect("failed to parse address");

            let total_supply = TestRpcClient::new(&alchemy_url)
                .get_storage_at(
                    &dai_address,
                    U256::from(1),
                    Some(BlockSpec::Number(16220843)),
                )
                .await
                .expect("should have succeeded");

            assert_eq!(
                total_supply,
                Some(
                    U256::from_str_radix(
                        "000000000000000000000000000000000000000010a596ae049e066d4991945c",
                        16
                    )
                    .expect("failed to parse storage location")
                )
            );
        }

        #[tokio::test]
        async fn get_storage_at_latest() {
            let alchemy_url = get_alchemy_url();

            let dai_address = Address::from_str("0x6b175474e89094c44da98b954eedeac495271d0f")
                .expect("failed to parse address");

            let _total_supply = TestRpcClient::new(&alchemy_url)
                .get_storage_at(
                    &dai_address,
                    U256::from_str_radix(
                        "0000000000000000000000000000000000000000000000000000000000000001",
                        16,
                    )
                    .expect("failed to parse storage location"),
                    Some(BlockSpec::latest()),
                )
                .await
                .expect("should have succeeded");
        }

        #[tokio::test]
        async fn get_storage_at_future_block() {
            let alchemy_url = get_alchemy_url();

            let dai_address = Address::from_str("0x6b175474e89094c44da98b954eedeac495271d0f")
                .expect("failed to parse address");

            let storage_slot = TestRpcClient::new(&alchemy_url)
                .get_storage_at(
                    &dai_address,
                    U256::from(1),
                    Some(BlockSpec::Number(MAX_BLOCK_NUMBER)),
                )
                .await
                .expect("should have succeeded");

            assert!(storage_slot.is_none());
        }

        #[tokio::test]
        async fn network_id_success() {
            let alchemy_url = get_alchemy_url();

            let version = TestRpcClient::new(&alchemy_url)
                .network_id()
                .await
                .expect("should have succeeded");

            assert_eq!(version, 1);
        }

        #[tokio::test]
        async fn stores_result_in_cache() {
            let alchemy_url = get_alchemy_url();
            let client = TestRpcClient::new(&alchemy_url);
            let dai_address = Address::from_str("0x6b175474e89094c44da98b954eedeac495271d0f")
                .expect("failed to parse address");

            let total_supply = client
                .get_storage_at(
                    &dai_address,
                    U256::from(1),
                    Some(BlockSpec::Number(16220843)),
                )
                .await
                .expect("should have succeeded");

            let cached_files = client.files_in_cache();
            assert_eq!(cached_files.len(), 1);

            let mut file = File::open(&cached_files[0]).expect("failed to open file");
            let cached_result: Option<U256> =
                serde_json::from_reader(&mut file).expect("failed to parse");

            assert_eq!(total_supply, cached_result);
        }

        #[tokio::test]
        async fn concurrent_writes_to_cache_smoke_test() {
            let client = TestRpcClient::new(&get_alchemy_url());

            let test_contents = "some random test data 42";
            let cache_key = "cache-key";

            assert_eq!(client.files_in_cache().len(), 0);

            join_all((0..100).map(|_| client.write_response_to_cache(cache_key, test_contents)))
                .await;

            assert_eq!(client.files_in_cache().len(), 1);

            let contents = tokio::fs::read_to_string(&client.files_in_cache()[0])
                .await
                .unwrap();
            assert_eq!(contents, serde_json::to_string(test_contents).unwrap());
        }

        #[tokio::test]
        async fn handles_invalid_type_in_cache_single_call() {
            let alchemy_url = get_alchemy_url();
            let client = TestRpcClient::new(&alchemy_url);
            let dai_address = Address::from_str("0x6b175474e89094c44da98b954eedeac495271d0f")
                .expect("failed to parse address");

            client
                .get_storage_at(
                    &dai_address,
                    U256::from(1),
                    Some(BlockSpec::Number(16220843)),
                )
                .await
                .expect("should have succeeded");

            // Write some valid JSON, but invalid U256
            tokio::fs::write(&client.files_in_cache()[0], "\"not-hex\"")
                .await
                .unwrap();

            client
                .get_storage_at(
                    &dai_address,
                    U256::from(1),
                    Some(BlockSpec::Number(16220843)),
                )
                .await
                .expect("should have succeeded");
        }

        #[tokio::test]
        async fn handles_invalid_type_in_cache_batch_call() {
            let alchemy_url = get_alchemy_url();
            let client = TestRpcClient::new(&alchemy_url);

            let dai_address = Address::from_str("0x6b175474e89094c44da98b954eedeac495271d0f")
                .expect("failed to parse address");
            let block_spec = BlockSpec::Number(16220843);

            // Make an initial call to populate the cache.
            client
                .get_account_info(&dai_address, Some(block_spec.clone()))
                .await
                .expect("initial call should succeed");
            assert_eq!(client.files_in_cache().len(), 3);

            // Write some valid JSON, but invalid U256
            tokio::fs::write(&client.files_in_cache()[0], "\"not-hex\"")
                .await
                .unwrap();

            // Call with invalid type in cache fails, but removes faulty cache item
            client
                .get_account_info(&dai_address, Some(block_spec.clone()))
                .await
                .expect_err("should fail due to invalid json in cache");
            assert_eq!(client.files_in_cache().len(), 2);

            // Subsequent call fetches removed cache item and succeeds.
            client
                .get_account_info(&dai_address, Some(block_spec.clone()))
                .await
                .expect("subsequent call should succeed");
            assert_eq!(client.files_in_cache().len(), 3);
        }
    }
}
