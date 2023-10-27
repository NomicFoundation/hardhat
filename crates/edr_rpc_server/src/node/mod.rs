// It's preferable to have a separate node.rs file as it's easier to jump to it by name.
#[allow(clippy::module_inception)]
mod node;
mod node_data;
mod node_error;

pub use node::Node;
pub use node_error::NodeError;
