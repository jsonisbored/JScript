import {
    Lexer,
    Parser,
    Generator,
} from "./../src/lib.ts";

/*

let mut a = 0; //  Mutable variable,  mutable value
let a = 0;     // Constant variable,  mutable value
const a = 0;   // Constant variable, constant value

or probably just match js

let a = 0;     // Mutable variable,  mutable value
const a = 0;   // Constant variable, mutable value

*/


const input = await Deno.readTextFile("./example/main.rus");

const { tokens } = new Lexer(input).tokenizer();

const { ast, errors: _errors } = new Parser(tokens).parse();
// console.dir(ast, { depth: 10, });
// console.log(_errors);

const js = new Generator(ast).generate();
console.log(js);

