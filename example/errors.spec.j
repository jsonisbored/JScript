import { add } from "file.js";
// JS<add(a: number, b: number): number> 

let this_errors = add(5).catch(|err| {
    // Handle `err`
});
let twelve = add(5).try_or(12);

let error_chaining = value_from_js?.a()?.b()?.c();

