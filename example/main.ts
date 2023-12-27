import {
    parse,
    Program,
    Expr,
    Stmt,
    ASTKinds,
    ExprStmt,
    Pattern,
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
    Semantic = "Semantic",
    Transform = "Transform",
    Type = "Type",
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
            const vars = s.pattern.kind === ASTKinds.Ident ?
            [s.pattern.literal] :
            s.pattern.items.map(i => i.literal)
            
            for (const name of vars) {
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
            }
        } else if (s.kind === ASTKinds.AssignStmt) {
            const constants: string[] = [];
            const notfounds: string[] = [];
            if (s.pattern.kind === ASTKinds.Ident) {
                if (scope.consts.has(s.pattern.literal)) {
                    constants.push(s.pattern.literal);
                } else if (!scope.lets.has(s.pattern.literal)) {
                    notfounds.push(s.pattern.literal);
                }
            } else if (s.pattern.kind === ASTKinds.ArrayPat) {
                for (const {literal} of s.pattern.items) {
                    if (scope.consts.has(literal)) {
                        constants.push(literal);
                    } else if (!scope.lets.has(literal)) {
                        notfounds.push(literal);
                    }
                }
            }

            for (const c of constants) {
                errors.push({
                    kind: ErrorKind.Semantic,
                    line: s.pos.line,
                    offset: s.pos.offset,
                    message: `Cannont assign to \`${c}\` because it is immutable`,
                });
            }
            for (const n of notfounds) {
                errors.push({
                    kind: ErrorKind.Semantic,
                    line: s.pos.line,
                    offset: s.pos.offset,
                    message: `Cannont find variable \`${n}\` in this scope`,
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

function transform(ast: Program): Error[] {
    const errors: Error[] = [];

    function stmt(s: Stmt): Stmt {
        if (
            s.kind === ASTKinds.LetStmt ||
            s.kind === ASTKinds.AssignStmt || 
            s.kind === ASTKinds.ReturnStmt || 
            s.kind === ASTKinds.ExprStmt
        ) {
            s.expr = expr(s.expr);
            return s;
        } else if (s.kind === ASTKinds.FnStmt) {
            s.stmts = s.stmts.map(stmt);
            return s;
        }
        return s;
    }

    function expr(e: Expr): Expr {
        if (e.kind === ASTKinds.ArrayExpr) {
            e.items.forEach(i => i.expr = expr(i.expr));
            return e;
        } else if (
            e.kind === ASTKinds.SumExpr ||
            e.kind === ASTKinds.ProdExpr
        ) {
            e.left = expr(e.left);
            e.right = expr(e.right);
            return e;
        } else if (
            e.kind === ASTKinds.GroupExpr
        ) {
            e.expr = expr(e.expr);
            return e;
        } else if (
            e.kind === ASTKinds.NumExpr ||
            e.kind === ASTKinds.StringExpr ||
            e.kind === ASTKinds.IdentExpr
        ) {
            return e;
        } else if (e.kind === ASTKinds.RangeExpr) {
            e.min = expr(e.min);
            e.max = expr(e.max);
        }
        return e;
    }

    for (const s of ast.stmts) {
        stmt(s);
    }

    return errors;
}

interface TypeScope {
    var_types: Record<string, { type: string }>,
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

            if (s.pattern.kind === ASTKinds.Ident) {
                scope.var_types[s.pattern.literal] = s.pattern;
            } else if (s.pattern.kind === ASTKinds.ArrayPat) {
                for (const i of s.pattern.items) {
                    scope.var_types[i.literal] = i;
                }
            }
        } else if (s.kind === ASTKinds.AssignStmt) {
            expr(s.expr);

            const vars = s.pattern.kind === ASTKinds.Ident ?
                        [s.pattern.literal] :
                        s.pattern.items.map(i => i.literal)
                        
            for (const v of vars) {
                const t = scope.var_types[v];
                if (t.type === "idk") {
                    t.type = s.expr.type;
                } else if (s.expr.type !== t.type) {
                    errors.push({
                        kind: ErrorKind.Type,
                        line: s.pos.line,
                        offset: s.pos.offset,
                        message: `Cannot assign type '${s.expr.type}' to type '${v}'`,
                    });
                }
            }
        } else if (s.kind === ASTKinds.FnStmt) {
            scope_index ++;
            scopes[scope_index] = JSON.parse(JSON.stringify(scope));
            for (const p of s.params) {
                scopes[scope_index].var_types[p.name] = p;
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
            const type = scope.var_types[e.literal].type ?? "idk";
            e.type = type;
            return type;
        } else if (e.kind === ASTKinds.ArrayExpr) {
            const type = e.type.match(/<([A-z]+)>/);
            if (!type) {
                errors.push({
                    kind: ErrorKind.Type,
                    line: e.pos.line,
                    offset: e.pos.offset,
                    message: `Compiler error`,
                });
            } else {
                for (const i of e.items) {
                    const ie = expr(i.expr);
                    if (ie !== type[1]) {
                        errors.push({
                            kind: ErrorKind.Type,
                            line: e.pos.line,
                            offset: e.pos.offset,
                            message: `Item of type '${ie}' does not match '${type[1]}'`,
                        });
                    }
                }
            }
        } else if (e.kind === ASTKinds.RangeExpr) {
            return e.type;
        } else if (e.kind === ASTKinds.GetFieldExpr) {
            if (e.expr.kind === ASTKinds.ArrayExpr) {
                const type = e.expr.type.match(/<([A-z]+)>/);
                if (type) {
                    return type[1];
                }
            }
            return "idk";
        } else if (e.kind === ASTKinds.GetIndexExpr) {
            if (e.expr.kind === ASTKinds.ArrayExpr) {
                const type = e.expr.type.match(/<([A-z]+)>/);
                if (type) {
                    return type[1];
                }
            }
            return "idk";
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
    
    function pattern(p: Pattern): string {
        if (p.kind === ASTKinds.Ident) {
            return p.literal;
        } else if (p.kind === ASTKinds.ArrayPat) {
            return "["
                +p.items.map(i => i.literal).join(", ")
                +"]";
        }
        return "";
    }

    function stmt(s: Stmt): string {
        let output = indent;
        if (s.kind === ASTKinds.CommentStmt) {
            output += s.literal;
        } else if (s.kind === ASTKinds.ExprStmt) {
            output += expr(s.expr);
        } else if (s.kind === ASTKinds.LetStmt) {
            output += (s.mut ? "let " : "const ")
                +pattern(s.pattern)
                +" = "
                +expr(s.expr)
                +";";
        } else if (s.kind === ASTKinds.AssignStmt) {
            output += pattern(s.pattern)
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
        } else if (e.kind === ASTKinds.ArrayExpr) {
            output += "["
                +e.items.map(i => expr(i.expr)).join(", ")
                +"]";
        } else if (e.kind === ASTKinds.RangeExpr) {
            if (
                e.min.kind === ASTKinds.NumExpr &&
                e.max.kind === ASTKinds.NumExpr
            ) {
                const min = e.min.value;
                const max = e.max.value + (e.inclusive ? 1 : 0);

                output += '['
                    +new Array(max - min)
                        .fill(0)
                        .map((_, i) => i+min)
                        .join(", ")
                    +']';
            } else {
                const min = expr(e.min);
                const max = expr(e.max) + (e.inclusive ? "+1" : "");
                
                output += `Array(${max}-${min}).fill(0).map((_, i) => i+${min})`;
            }
        } else if (e.kind === ASTKinds.GetFieldExpr) {
            output += expr(e.expr)
                +"."
                +e.field;
        } else if (e.kind === ASTKinds.GetIndexExpr) {
            output += expr(e.expr)
                +"["
                +expr(e.index)
                +"]";
        }
        return output;
    }

    for (const s of ast.stmts) {
        output += stmt(s) + "\n";
    }

    return output;
}

async function main() {
    const input = await Deno.readTextFile("./example/test.j");

    const { ast, errs } = parse(input);
    console.log(ast);
    if (errs.length || !ast) {
        for (const e of errs) {
            console.error(e);
            error(input, e.pos.line, e.pos.offset, "Syntax Error: ");
        }
        return;
    }

    const errors: Error[] = [];

    errors.concat(semantic_checker(ast));
    // errors.concat(transform(ast));
    errors.concat(type_check(ast));
    
    for (const e of errors) {
        error(input, e.line, e.offset, "Type Error: "+e.message);
    }

    const output = generate(ast);

    Deno.writeTextFile("./example/test.js", output);
}
main();
