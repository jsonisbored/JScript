import {
    Lexer,
    Parser,
    Transformer,
    Generator,
    Error,
} from "./../src/lib.ts";

/*

let mut a = 0; //  Mutable variable,  mutable value
let a = 0;     // Constant variable,  mutable value
const a = 0;   // Constant variable, constant value

or maybe just match js

let a = 0;     //  Mutable variable, mutable value
const a = 0;   // Constant variable, mutable value

*/

const input = await Deno.readTextFile("./example/program.rus");
// console.log(input);

const { tokens } = new Lexer(input).tokenizer();
// console.log(tokens);

const { ast, errors: _errors } = new Parser(tokens).parse();
// console.dir(ast, { depth: 15, });

function format_error(e: Error): string {
    return `${input.slice(e.position-50, e.position)}\n${e.message}`;
}
// console.log(_errors.map(format_error));

const { ast: transformed } = new Transformer(ast).transform();
console.dir(transformed, { depth: 15, });

const js = new Generator(transformed).generate();
// console.log(js);

await Deno.writeTextFile("./example/program.ts", js);
