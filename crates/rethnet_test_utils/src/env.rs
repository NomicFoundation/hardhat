//! Helper functions for environment variables

fn get_non_empty_env_var_or_panic(name: &'static str) -> String {
    let result = std::env::var_os(name)
        .unwrap_or_else(|| panic!("{name} environment variable not defined"))
        .into_string()
        .expect("Couldn't convert OsString into a String");
    if result.is_empty() {
        panic!("{name} environment variable is empty")
    } else {
        result
    }
}

/// Returns the Alchemy URL from the environment variables.
///
/// # Panics
///
/// Panics if the environment variable is not defined, or if it is empty.
pub fn get_alchemy_url() -> String {
    get_non_empty_env_var_or_panic("ALCHEMY_URL")
}

/// Returns the Infura URL from the environment variables.
///
/// # Panics
///
/// Panics if the environment variable is not defined, or if it is empty.
pub fn get_infura_url() -> String {
    get_non_empty_env_var_or_panic("INFURA_URL")
}
