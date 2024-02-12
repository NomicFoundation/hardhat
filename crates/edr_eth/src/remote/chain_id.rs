pub(super) fn chain_id_from_url(url: &url::Url) -> Option<u64> {
    let host = url.host_str()?;
    match host {
        "mainnet.infura.io" | "eth-mainnet.g.alchemy.com" => Some(1),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    use url::Url;

    use super::*;

    #[test]
    fn mainnet() -> anyhow::Result<()> {
        let url = Url::from_str("https://mainnet.infura.io/v3/abcdefgh123456789")?;
        assert_eq!(chain_id_from_url(&url), Some(1));

        let url = Url::from_str("https://eth-mainnet.g.alchemy.com/v2/abcdefgh123456789")?;
        assert_eq!(chain_id_from_url(&url), Some(1));

        let url = Url::from_str("https://eth-goerli.g.alchemy.com/v2/abcdefgh123456789")?;
        assert_eq!(chain_id_from_url(&url), None);

        let url = Url::from_str("https://ropsten.infura.io/v3/abcdefgh123456789")?;
        assert_eq!(chain_id_from_url(&url), None);

        let url = Url::from_str("https://localhost:8545")?;
        assert_eq!(chain_id_from_url(&url), None);

        Ok(())
    }
}
