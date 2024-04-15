use edr_eth::Address;
use edr_evm::precompile::{self, Precompiles};

#[test]
fn kzg_point_evaluation_present_in_cancun() {
    const KZG_POINT_EVALUATION_ADDRESS: Address = precompile::u64_to_address(0x0A);

    let precompiles = Precompiles::cancun();
    assert!(precompiles.contains(&KZG_POINT_EVALUATION_ADDRESS));
}
