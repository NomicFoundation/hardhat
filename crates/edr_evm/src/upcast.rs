/// Trait for upcasting a super trait object to a sub trait object.
pub trait Upcast<T: ?Sized> {
    /// Upcasts the trait object.
    fn upcast(&self) -> &T;
}
