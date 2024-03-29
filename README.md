# JScript
Building a language while learning at the same time. JScript transpiles to JavaScript.

## Goals
- Address pain points in JavaScript
- Use features that JavaScript will never have
- Maintain JavaScript ecosystem interop

## Progress
1. Parsing, checking, and generating
    - ✓ | Basic expressions
    - ✓ | Let, fn, assign statements
    - ✓ | Arrays with destructuring
    - ✓ | Syntax for ranges
    - ✓ | If statements & expressions
    - ✗ | Loops
    - ✗ | Structs
    - ✗ | Enums
    - ✗ | Pattern matching
    - ✗ | Impl statements
2. ✗ | Parser rewrite
3. ✗ | Good error messages
4. ✗ | Decide on a macro system
5. ✗ | Lowering and optimizations
6. ✗ | Figure out CLI, standard library, & package manager details

## Example
Code will look a lot like rust with a garbage collector.
```rs
fn fib(n: num): num {
    match n {
        0 => 1,
        1 => 1,
        _ => fib(n-1) + fib(n-2),
    }
}
```

## Main Inspirations
- [Rust](https://play.rust-lang.org/)
- [ReScript](https://rescript-lang.org/try)
