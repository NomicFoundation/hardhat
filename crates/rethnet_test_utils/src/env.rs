//! Helper functions for environment variables

/// Returns the Alchemy URL from the environment variables.
///
/// # Panics
///
/// Panics if the environment variable is not defined, or if it is empty.
pub fn get_alchemy_url() -> String {
    match std::env::var_os("ALCHEMY_URL")
        .expect("ALCHEMY_URL environment variable not defined")
        .into_string()
        .expect("Couldn't convert OsString into a String")
    {
        url if url.is_empty() => panic!("ALCHEMY_URL environment variable is empty"),
        url => url,
    }
}
