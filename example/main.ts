import {
    Lexer,
    Parser,
    Transformer,
    Generator,
    Error,
} from "./../src/lib.ts";

const input = await Deno.readTextFile("./example/program.rus");
const lines = input.split("\n").length;
// console.log(input);


function time(name: string) {
    const then = performance.now();
    return () => {
        const ns = (performance.now()-then)*1000 |0;
        let str = name.padStart(12);

        str += " ";
        str += ns.toString().padStart(6);
        str += " ns";

        str += " ";
        str += (ns/lines).toFixed(2).padStart(8);
        str += " ns/line";

        console.log(str);
    };
}

const lexer = time("lexer");
const { tokens } = new Lexer(input).tokenizer();
lexer();
// console.log(tokens);

const parser = time("parser");
const { ast, errors: _errors } = new Parser(tokens).parse();
parser();
// console.dir(ast, { depth: 15, });

function format_error(e: Error): string {
    return `${input.slice(e.position-50, e.position)}\n${e.message}`;
}
// console.log(_errors.map(format_error));

const transformer = time("transformer");
const { ast: transformed, errors: _errors2 } = new Transformer(ast).transform();
transformer();
// console.dir(transformed, { depth: 15, });
// console.log(_errors2.map(format_error));

const generator = time("generator");
const js = new Generator(transformed).generate();
generator();
// console.log(js);

const writing = time("writing");
await Deno.writeTextFile("./example/program.ts", js);
writing();
