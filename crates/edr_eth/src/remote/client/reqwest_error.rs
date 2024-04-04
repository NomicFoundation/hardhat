use std::error::Error;

use lazy_static::lazy_static;
use regex::{Captures, Regex, Replacer};
use url::Url;

/// Custom wrapper for `reqwest::Error` to avoid displaying the url in error
/// message that could contain sensitive information such as API keys.
#[derive(thiserror::Error, Debug)]
pub struct ReqwestError(#[from] reqwest::Error);

impl From<ReqwestError> for reqwest::Error {
    fn from(value: ReqwestError) -> Self {
        value.0
    }
}

// Matches the `Display` implementation for `reqwest::Error` except where noted
impl std::fmt::Display for ReqwestError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if self.0.is_builder() {
            f.write_str("builder self")?;
        } else if self.0.is_request() {
            f.write_str("self sending request")?;
        } else if self.0.is_body() {
            f.write_str("request or response body self")?;
        } else if self.0.is_decode() {
            f.write_str("self decoding response body")?;
        } else if self.0.is_redirect() {
            f.write_str("self following redirect")?;
        } else if self.0.is_status() {
            let code = self.0.status().expect("Error is status");
            let prefix = if code.is_client_error() {
                "HTTP status client self"
            } else {
                debug_assert!(code.is_server_error());
                "HTTP status server self"
            };
            write!(f, "{prefix} ({code})")?;
        } else {
            // It might be an upgrade, but `reqwest` doesn't expose checking that on the
            // self type.
            f.write_str("unknown self")?;
        }

        // This is changed from the original code
        if let Some(host) = self.0.url().and_then(|url| url.host_str()) {
            write!(f, " for host ({host})")?;
        }

        if let Some(e) = self.0.source() {
            write!(f, ": {e}")?;
        }

        Ok(())
    }
}

/// Custom wrapper for `reqwest_middleware::Error` to avoid displaying the url
/// in error message that could contain sensitive information such as API keys.
#[derive(thiserror::Error, Debug)]
pub enum MiddlewareError {
    /// There was an error running some middleware
    Middleware(#[from] anyhow::Error),
    /// Error from the underlying reqwest client
    Reqwest(#[from] ReqwestError),
}

impl From<reqwest_middleware::Error> for MiddlewareError {
    fn from(value: reqwest_middleware::Error) -> Self {
        match value {
            reqwest_middleware::Error::Middleware(middleware) => {
                MiddlewareError::Middleware(middleware)
            }
            reqwest_middleware::Error::Reqwest(reqwest) => MiddlewareError::Reqwest(reqwest.into()),
        }
    }
}

impl std::fmt::Display for MiddlewareError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            MiddlewareError::Middleware(e) => {
                let s = e.to_string();
                let replaced = URL_REGEX.replace_all(&s, UrlReplacer);
                f.write_str(&replaced)
            }
            MiddlewareError::Reqwest(e) => e.fmt(f),
        }
    }
}

lazy_static! {
    static ref URL_REGEX: Regex = Regex::new(r"(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)").expect("Test checks panic");
}

/// Replaces urls in strings with the host part only.
struct UrlReplacer;

impl Replacer for UrlReplacer {
    fn replace_append(&mut self, caps: &Captures<'_>, dst: &mut String) {
        if let Some(host) = caps.get(0).and_then(|url| {
            Url::parse(url.as_str())
                .ok()
                .and_then(|url| url.host_str().map(ToString::to_string))
        }) {
            dst.push_str(&host);
        } else {
            dst.push_str("<unknown host>");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_display_middleware_error() -> anyhow::Result<()> {
        let error = MiddlewareError::Middleware(anyhow::anyhow!(
            "Some middleware error occurred for url: http://subdomain.example.com:1234/secret something else"
        ));
        assert_eq!(
            error.to_string(),
            "Some middleware error occurred for url: subdomain.example.com something else"
        );

        let error = MiddlewareError::Middleware(anyhow::anyhow!(
            "Some middleware error occurred for url: https://subdomain.example.com/path?query=secret something else"
        ));
        assert_eq!(
            error.to_string(),
            "Some middleware error occurred for url: subdomain.example.com something else"
        );

        Ok(())
    }
}
