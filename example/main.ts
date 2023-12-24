import {
    parse,
    Program,
    Expr,
    Stmt,
    ASTKinds,
    ExprStmt,
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
    Semantic = "Semantic",
}
interface Error {
    kind: ErrorKind,
    line: number,
    offset: number,
    message: string,
}

interface SemanticScope {
    consts: Set<string>,
    lets: Set<string>,
    fns: Set<string>,
}
function semantic_checker(ast: Program): Error[] {
    const errors: Error[] = [];
    const scopes: SemanticScope[] = [{
        consts: new Set(),
        lets: new Set(),
        fns: new Set(),
    }];
    let scope_index = 0;

    function stmt(s: Stmt) {
        const scope = scopes[scope_index];
        if (s.kind === ASTKinds.LetStmt) {
            const name = s.ident.literal;
            if (
                scope.lets.has(name) ||
                scope.consts.has(name) ||
                scope.fns.has(name)
            ) {
                errors.push({
                    kind: ErrorKind.Semantic,
                    line: s.pos.line,
                    offset: s.pos.offset,
                    message: `Variable \`${name}\` already exists`
                });
            }
            if (s.mut) {
                scope.lets.add(name);
            } else {
                scope.consts.add(name);
            }
        } else if (s.kind === ASTKinds.AssignStmt) {
            const name = s.ident.literal;
            if (scope.consts.has(name)) {
                errors.push({
                    kind: ErrorKind.Semantic,
                    line: s.pos.line,
                    offset: s.pos.offset,
                    message: `Cannont assign to \`${name}\` because it is immutable`
                });
            } else if (!scope.lets.has(name)) {
                errors.push({
                    kind: ErrorKind.Semantic,
                    line: s.pos.line,
                    offset: s.pos.offset,
                    message: `Cannont find variable \`${name}\` in this scope`
                });
            }
        } else if (s.kind === ASTKinds.FnStmt) {
            const name = s.ident.literal;
            if (scope.fns.has(name)) {
                errors.push({
                    kind: ErrorKind.Semantic,
                    line: s.pos.line,
                    offset: s.pos.offset,
                    message: `Fn \`${name}\` has already been declared`
                });
            } else {
                scope.fns.add(name);
            }
            scope_index ++;
            scopes[scope_index] = Object.assign({}, scope);
            s.stmts.forEach(stmt);
            scope_index --;
        }
    }
    // function expr(e: Expr) {

    // }

    for (const s of ast.stmts) {
        stmt(s);
    }

    return errors;
}

interface TypeScope {
    var_types: Record<string, string>,
}
function type_check(ast: Program): Error[] {
    const errors: Error[] = [];
    const scopes: TypeScope[] = [{
        var_types: {},
    }];
    let scope_index = 0;

    function stmt(s: Stmt) {
        const scope = scopes[scope_index];
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
            scope.var_types[s.ident.literal] = s.type;
        } else if (s.kind === ASTKinds.AssignStmt) {
            expr(s.expr);
            const v = scope.var_types[s.ident.literal];
            if (s.expr.type !== v) {
                errors.push({
                    kind: ErrorKind.Type,
                    line: s.pos.line,
                    offset: s.pos.offset,
                    message: `Cannot assign type '${s.expr.type}' to type '${v}'`,
                });
            }
        } else if (s.kind === ASTKinds.FnStmt) {
            scope_index ++;
            scopes[scope_index] = JSON.parse(JSON.stringify(scope));
            for (const p of s.params) {
                scopes[scope_index].var_types[p.name] = p.type;
            }
            
            s.stmts.forEach(stmt);
            scope_index --;

            s.stmts
                .filter(s => s.kind === ASTKinds.ReturnStmt)
                .map(s => (s as ExprStmt).expr) // Safe, filtered above
                .forEach(e => {
                    if (e.type !== s.return_type) {
                        errors.push({
                            kind: ErrorKind.Type,
                            line: e.pos.line,
                            offset: s.pos.offset,
                            message: `Expected type '${s.return_type}' found type '${e.type}'`,
                        });
                    }
                });
        } else if (s.kind === ASTKinds.ReturnStmt) {
            expr(s.expr);
        } else if (s.kind === ASTKinds.ExprStmt) {
            expr(s.expr);
        }
    }
    function expr(e: Expr): string {
        const scope = scopes[scope_index];
        
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
            const left = expr(e.left);
            const right = expr(e.right);
            e.type = left;

            if (
                left === "num" &&
                right !== "num"
            ) {
                errors.push({
                    kind: ErrorKind.Type,
                    line: e.pos.line,
                    offset: e.pos.offset,
                    message: `Expected type 'num' to the right of '${e.op}'`,
                });
            } else if (
                e.op === "+" &&
                left === "str" &&
                right !== "str"
            ) {
                errors.push({
                    kind: ErrorKind.Type,
                    line: e.pos.line,
                    offset: e.pos.offset,
                    message: `Expected type 'str' to the right of '${e.op}'`,
                });
            }
            return e.type;
        } else if (e.kind === ASTKinds.IdentExpr) {
            const type = scope.var_types[e.literal] ?? "idk";
            e.type = type;
            return type;
        }
        return "idk";
    }
    
    for (const s of ast.stmts) {
        stmt(s);
    }

    return errors;
}

function generate(ast: Program): string {
    let output = "";
    let indent = "";
    
    function stmt(s: Stmt): string {
        let output = indent;
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
        } else if (s.kind === ASTKinds.ReturnStmt) {
            output += "return "
                +expr(s.expr)
                +";";
        } else if (s.kind === ASTKinds.FnStmt) {
            output += "function "
                +s.ident.literal
                +"("
                +s.params.map(p => p.name).join(", ")
                +") {\n"
            indent += "\t";
            output += s.stmts.map(stmt).join("\n")
            indent = indent.slice(0, -1);
            output += "\n}";
        }
        return output;
    }
    function expr(e: Expr): string {
        let output = "";
        if (e.kind === ASTKinds.SumExpr) {
            output += expr(e.left)
                +" "
                +e.op
                +" "
                +expr(e.right);
        } else if (e.kind === ASTKinds.ProdExpr) {
            output += expr(e.left)
                +" "
                +e.op
                +" "
                +expr(e.right);
        } else if (e.kind === ASTKinds.GroupExpr) {
            output += "("
                +expr(e.expr)
                +")";
        } else if (e.kind === ASTKinds.NumExpr) {
            output += e.value;
        } else if (e.kind === ASTKinds.StringExpr) {
            output += e.literal;
        } else if (e.kind === ASTKinds.IdentExpr) {
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

    const validate_errors = semantic_checker(ast);
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
