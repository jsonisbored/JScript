import {
    parse,
    Program,
    Expr,
    Stmt,
    ASTKinds,
    LetStmt,
} from "../src/parser.ts";

function error(input: string, line: number, offset: number, message: string) {
    const lines = input.split("\n");
    const max_pad = Math.ceil(Math.log10(lines.length+1));
    
    const start = Math.max(line-5, 0);
    const end = Math.min(line, lines.length);
    const msg = lines
        .map((s, i) => `${(i+1+"").padEnd(max_pad, " ")} |  ${s}`)
        .slice(start, end)
        .join("\n")
        +"\n"
        +" ".repeat(max_pad)+" |  "
        +"^".padStart(offset+1, " ")
        +"\n"
        +message;
    console.error(msg);
}

enum ErrorKind {
    Type = "Type",
    Validate = "Validate",
}
interface Error {
    kind: ErrorKind,
    line: number,
    offset: number,
    message: string,
}

function type_check(ast: Program): Error[] {
    const errors: Error[] = [];
    const vars = new Map<string, LetStmt>();

    function stmt(s: Stmt) {
        if (s.kind === ASTKinds.LetStmt) {
            expr(s.expr);
            if (!s.type) {
                s.type = s.expr.type;
            } else if (s.type !== s.expr.type) {
                errors.push({
                    kind: ErrorKind.Type,
                    line: s.pos.line,
                    offset: s.pos.offset,
                    message: `Cannot assign type '${s.expr.type}' to type '${s.type}'`,
                });
            }
            vars.set(s.ident.literal, s);
        } else if (s.kind === ASTKinds.AssignStmt) {
            expr(s.expr);
            const v = vars.get(s.ident.literal);
            if (s.expr.type !== v?.type) {
                errors.push({
                    kind: ErrorKind.Type,
                    line: s.pos.line,
                    offset: s.pos.offset,
                    message: `Cannot assign type '${s.expr.type}' to type '${v?.type}'`,
                });
            }
        }
    }
    function expr(e: Expr): string {
        if (
            e.kind === ASTKinds.StringExpr ||
            e.kind === ASTKinds.NumExpr ||
            e.kind === ASTKinds.GroupExpr
        ) {
            return e.type;
        } else if (
            e.kind === ASTKinds.ProdExpr ||
            e.kind === ASTKinds.SumExpr
        ) {
            if (
                e.left.type === "num" &&
                e.right.type !== "num"
            ) {
                errors.push({
                    kind: ErrorKind.Type,
                    line: e.pos.line,
                    offset: e.pos.offset,
                    message: `Expected type 'num' to the right of '${e.op}'`,
                });
            } else if (
                e.op === "+" &&
                e.left.type === "str" &&
                e.right.type !== "str"
            ) {
                errors.push({
                    kind: ErrorKind.Type,
                    line: e.pos.line,
                    offset: e.pos.offset,
                    message: `Expected type 'str' to the right of '${e.op}'`,
                });
            }
            return e.type;
        }
        return "idk";
    }
    
    for (const s of ast.stmts) {
        stmt(s);
    }

    return errors;
}

function validate(ast: Program): Error[] {
    const errors: Error[] = [];
    const consts = new Set<string>();
    const lets = new Set<string>();

    function stmt(s: Stmt) {
        if (s.kind === ASTKinds.LetStmt) {
            const name = s.ident.literal;
            if (lets.has(name) || consts.has(name)) {
                errors.push({
                    kind: ErrorKind.Validate,
                    line: s.pos.line,
                    offset: s.pos.offset,
                    message: `Variable \`${name}\` already exists`
                });
            }
            if (s.mut) {
                lets.add(name);
            } else {
                consts.add(name);
            }
        } else if (s.kind === ASTKinds.AssignStmt) {
            const name = s.ident.literal;
            if (consts.has(name)) {
                errors.push({
                    kind: ErrorKind.Validate,
                    line: s.pos.line,
                    offset: s.pos.offset,
                    message: `Cannont assign to \`${name}\` because it is immutable`
                });
            } else if (!lets.has(name)) {
                errors.push({
                    kind: ErrorKind.Validate,
                    line: s.pos.line,
                    offset: s.pos.offset,
                    message: `Cannont find variable \`${name}\` in this scope`
                });
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

function generate(ast: Program): string {
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
            console.error(e);
            error(input, e.pos.line, e.pos.offset, "Syntax Error: ");
        }
        return;
    }

    const validate_errors = validate(ast);
    if (validate_errors.length) {
        for (const e of validate_errors) {
            error(input, e.line, e.offset, "Validate Error: "+e.message);
        }
    }
    
    const type_errors = type_check(ast);
    if (type_errors.length) {
        for (const e of type_errors) {
            error(input, e.line, e.offset, "Type Error: "+e.message);
        }
    }

    const output = generate(ast);

    Deno.writeTextFile("./example/output.js", output);
}
main();
