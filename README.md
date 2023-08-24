# RustScript
Name is temporary

The goal of this language is to address a lot of the pain points of JavaScript. Using the same approach as TypeScript but not stopping at types. Rust has obviously been the main inspiration for ideas. Ideally the language will feel a lot like Rust without the borrow checker.

This is my first attempt at building a programming language. It's been a lot of fun, and I've learned a lot. Although I'm sure there's plenty of mistakes and bad design decisions. I'll try to continue working on this while I have motivation, but I'm not sure if it will ever become usable.

### Architecture Overview
Source > Tokens > AST > Semantic checks > Transformer > Generator

### Changes in rewrite
Error recovery, error handing, and error messages.
