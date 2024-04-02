use cargo_toml::{Dependency, DependencyDetail, Manifest};

fn main() {
    let cargo_toml: Manifest = toml::from_str(include_str!("../edr_evm/Cargo.toml"))
        .expect("should deserialize Cargo.toml");
    let revm_version = match cargo_toml.dependencies.get("revm") {
        Some(Dependency::Simple(s)) => s.clone(),
        Some(Dependency::Detailed(DependencyDetail {
            version: Some(version),
            git,
            rev,
            ..
        })) => {
            let rev = rev.clone().map_or(String::new(), |rev| format!("@{rev}"));
            let git = git
                .clone()
                .map_or(String::new(), |git| format!("({git}{rev})"));
            format!("{git}{version}")
        }
        None => panic!("revm dependency not found"),
        _ => panic!("Unrecognized revm dependency format"),
    };
    println!("cargo:rustc-env=REVM_VERSION={revm_version}");
}
