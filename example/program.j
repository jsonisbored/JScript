// struct Sheep { naked: bool, name: str }

// impl Sheep {
//     fn is_naked(self: Self) -> bool {
//         self.naked
//     }

//     fn shear(mut self: Self) {
//         if self.is_naked() {
//             // Implementor methods can use the implementor's trait methods.
//             println("{} is already naked...", self.name());
//         } else {
//             println("{} gets a haircut!", self.name);

//             self.naked = true;
//         }
//     }
// }

// trait Animal {
//     // Associated function signature; `Self` refers to the implementor type.
//     fn new(name: str) -> Self;

//     // Method signatures; these will return a string.
//     fn name(self: Self) -> str;
//     fn noise(self: Self) -> str;

//     // Traits can provide default method definitions.
//     fn talk(self: Self) {
//         println("{} says {}", self.name(), self.noise());
//     }
// }

// // Implement the `Animal` trait for `Sheep`.
// impl Animal for Sheep {
//     // `Self` is the implementor type: `Sheep`.
//     fn new(name: str) -> Sheep {
//         Sheep { name: name, naked: false }
//     }

//     fn name(self: Self) -> str {
//         self.name
//     }

//     fn noise(self: Self) -> str {
//         if self.is_naked() {
//             "baaaaah?"
//         } else {
//             "baaaaah!"
//         }
//     }
    
//     // Default trait methods can be overridden.
//     fn talk(self: Self) {
//         // For example, we can add some quiet contemplation.
//         println("{} pauses briefly... {}", self.name, self.noise());
//     }
// }

// let mut dolly: Sheep = Sheep::new("Dolly");

// dolly.talk();
// dolly.shear();
// dolly.talk();
