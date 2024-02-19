use edr_eth::signature::Signature;

#[derive(Clone, Debug)]
pub struct Config {
    signature: Option<Signature>,
}
