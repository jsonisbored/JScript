import {
    parse,
    Program,
    Expr,
    Stmt,
    ASTKinds,
} from "../src/parser.ts";

function error(input: string, line: number, offset: number, message: string) {
    const start = Math.max(line-5, 0);
    const end = Math.min(line, input.split("\n").length);
    const msg = input
        .split("\n")
        .map((s, i) => `${i+1}  |  ${s}`)
        .splice(start, end)
        .join("\n")
        + "\n"
        +  "   |  " + "^".padStart(offset+1, " ")
        +"\n"
        +message;
    console.error(msg);
}

class CheckError {
    constructor(
        public line: number,
        public offset: number,
        public message: string
    ) {}
}

function check(ast: Program) {
    const errors: CheckError[] = [];
    const consts = new Set<string>();
    const lets = new Set<string>();

    function stmt(s: Stmt) {
        if (s.kind === ASTKinds.LetStmt) {
            const name = s.ident.literal;
            if (lets.has(name) || consts.has(name)) {
                errors.push(
                    new CheckError(
                        s.pos.line,
                        s.pos.offset,
                        `Variable \`${name}\` already exists`
                    )
                );
            }
            if (s.mut) {
                lets.add(name);
            } else {
                consts.add(name);
            }
        } else if (s.kind === ASTKinds.AssignStmt) {
            const name = s.ident.literal;
            if (consts.has(name)) {
                errors.push(
                    new CheckError(
                        s.pos.line,
                        s.pos.offset,
                        `Cannont assign to \`${name}\` because it is immutable`
                    )
                );
            } else if (!lets.has(name)) {
                errors.push(
                    new CheckError(
                        s.pos.line,
                        s.pos.offset,
                        `Cannont find variable \`${name}\` in this scope`
                    )
                );
            }
        }
    }
    // function expr(e: Expr) {

    // }

    for (const s of ast.stmts) {
        stmt(s);
    }

    return errors;
}

function generate(ast: Program) {
    let output = "";
    
    function stmt(s: Stmt): string {
        let output = "";
        if (s.kind === ASTKinds.CommentStmt) {
            output += s.literal;
        } else if (s.kind === ASTKinds.ExprStmt) {
            output += expr(s.expr);
        } else if (s.kind === ASTKinds.LetStmt) {
            output += (s.mut ? "let " : "const ")
                +s.ident.literal
                +" = "
                +expr(s.expr)
                +";";
        } else if (s.kind === ASTKinds.AssignStmt) {
            output += s.ident.literal
                +" = "
                +expr(s.expr)
                +";";
        }
        return output;
    }
    function expr(e: Expr): string {
        let output = "";
        if (e.kind === ASTKinds.SumExpr) {
            output += expr(e.left)
                +e.op
                +expr(e.right);
        } else if (e.kind === ASTKinds.ProdExpr) {
            output += expr(e.left)
                +e.op
                +expr(e.right);
        } else if (e.kind === ASTKinds.GroupExpr) {
            output += "("
                +expr(e.expr)
                +")";
        } else if (e.kind === ASTKinds.NumExpr) {
            output += e.value;
        } else if (e.kind === ASTKinds.StringExpr) {
            output += e.literal;
        }
        return output;
    }

    for (const s of ast.stmts) {
        output += stmt(s) + "\n";
    }

    return output;
}

async function main() {
    const input = await Deno.readTextFile("./example/test.rus");

    const { ast, errs } = parse(input);
    if (errs.length || !ast) {
        for (const e of errs) {
            error(input, e.pos.line, e.pos.offset, "Syntax Error: ");
        }
        return;
    }
    // console.log(ast);

    const errors = check(ast);
    if (errors.length) {
        for (const e of errors) {
            error(input, e.line, e.offset, "Checker Error: "+e.message);
        }
    }

    const output = generate(ast);

    Deno.writeTextFile("./example/output.js", output);
}
main();
