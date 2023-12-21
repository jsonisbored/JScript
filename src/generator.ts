import {
    AST,
    Expr,
    Stmt,
    Type,

    StmtKind,
    ExprKind,
    TypeKind,
} from "./types/mod.ts";

function decapitalize(s: string): string {
    return s[0].toLowerCase() + s.slice(1);
}

export class Generator {
    private ast: AST;
    private depth = "";
    private structs: Record<string, number> = {};
    private module = "";

    constructor(ast: AST) {
        this.ast = ast;
    }

    generate(): string {
        let output = "";
        for (const stmt of this.ast.stmts) {
            output += this.stmt(stmt);
        }

        return output;
    }

    stmt(stmt: Stmt): string {
        let output = this.depth;

        if (stmt.kind === StmtKind.Let) {
            output += `let ${
                stmt.name.value}: ${this.type(stmt.type)} = ${this.expr(stmt.init)};\n`;
        } else if (stmt.kind === StmtKind.Const) {
            output += `let ${stmt.name.value}: ${this.type(stmt.type)} = ${this.expr(stmt.init)};\n`;
        } else if (stmt.kind === StmtKind.Expr) {
            output += `${this.expr(stmt.expr)};\n`;
        } else if (stmt.kind === StmtKind.Break) {
            output += `break;\n`;
        } else if (stmt.kind === StmtKind.Continue) {
            output += `continue;\n`;
        } else if (stmt.kind === StmtKind.Return) {
            // output += `return`;

            if (stmt.expr) {
                output += this.expr(stmt.expr)+"\n";
            }

            // output += ";\n";
        } else if (stmt.kind === StmtKind.While) {
            output += `while (${this.expr(stmt.condition)}) ${
                this.expr(stmt.block)
            }`;
        } else if (stmt.kind === StmtKind.For) {
            output += `for (const ${stmt.name} of ${stmt.iter}) ${
                this.expr(stmt.block)
            }`;
        } else if (stmt.kind === StmtKind.Fn) {
            output += `let ${stmt.type.name.value} = (`;
            output += stmt.type.params.map(p => `${p.name.value}: ${p.type.value}`).join(", ");
            output += `) => ${this.expr(stmt.block)}`;
        } else if (stmt.kind === StmtKind.Impl) {
            output += `module ${stmt.impl_name.value}`;
            // output += stmt.for_name ? `: ${stmt.for_name.value}` : "";
            output += " = {\n";

            this.module = stmt.for_name?.value ?? stmt.impl_name.value;
            this.module = decapitalize(this.module);
            
            let first = true;
            for (const m of stmt.methods) {
                if (first) {
                    first = false;
                    output += `${this.depth}\tlet rec ${m.type.name.value} = (`;
                } else {
                    output += `${this.depth}\tand let ${m.type.name.value} = (`;
                }
                output += m.type.params.map(p => p.name.value).join(", ");
                output += `) => `;
                // output += `): ${m.type.return_type?.value} `;

                    this.depth += "\t";
                    output += this.expr(m.block);
                    this.depth = this.depth.slice(0, -1);

                output += "\n";
            }

            this.module = "";

            output += this.depth + "};\n";
        } else if (stmt.kind === StmtKind.Trait) {
            // output += `module type ${stmt.name.value} = {\n`;
            // output += "\ttype self\n"

            // this.module = stmt.name.value;
            
            // for (const m of stmt.methods) {
            //     output += this.depth+"\tlet " + m.type.name.value + ": (";
            //     output += m.type.params.map(p => this.type(p.type)).join(", ");
            //     output += `) => `;
            //     output += m.type.return_type ? this.type(m.type.return_type) : "";

            //         this.depth += "\t";
            //         output += m.block ? this.expr(m.block) : "";
            //         this.depth = this.depth.slice(0, -1);

            //     output += "\n";
            // }

            // this.module = "";

            // output += this.depth + "};\n";
        } else if (stmt.kind === StmtKind.Struct) {
            const name = decapitalize(stmt.name.value);
            this.structs[stmt.name.value] = this.depth.length;

            output += `type ${name} = {\n`;
            for (const f of stmt.fields) {
                output += `${this.depth}\tmutable ${f.name.value}: ${this.type(f.type)},\n`;
            }
            output += this.depth + "};\n";
        } else if (stmt.kind === StmtKind.Assign) {
            output += this.expr(stmt.expr);
            output += " "+stmt.operator.value+" ";
            output += this.expr(stmt.value);
            output += ";\n";
        }

        return output;
    }

    expr(expr: Expr): string {
        let output = "";

        if (expr.kind === ExprKind.Call) {
            const func = this.expr(expr.func);
            if (
                expr.func.kind === ExprKind.Ident &&
                func === "println"
            ) {
                output += `Js.log([${expr.args.map(e => this.expr(e)).join(", ")}])`;
            } else if (
                expr.func.kind === ExprKind.GetField &&
                expr.func.expr.kind === ExprKind.Ident &&
                expr.func.expr.ident.value === "self"
            ) {
                const args = expr.args.map(e => this.expr(e)).join(", ");
                output += expr.func.field.value;
                output += args.length ? `(self, ${expr.args.map(e => this.expr(e)).join(", ")})` : "(self)";
            } else {
                output += this.expr(expr.func) + `(${expr.args.map(e => this.expr(e)).join(", ")})`;
            }
        } else if (expr.kind === ExprKind.Ident) {
            output += expr.ident.value;
        } else if (expr.kind === ExprKind.String) {
            output += `"${expr.value}"`;
        } else if (
            expr.kind === ExprKind.Boolean || 
            expr.kind === ExprKind.Number
        ) {
            output += expr.value;
        } else if (expr.kind === ExprKind.Switch) {
            output += `switch (${this.expr(expr.expr)}) {\n`;
            for (const arm of expr.arms) {
                output += this.depth + "\t";

                const expr = this.expr(arm.expr);
                if (expr === "_") {
                    output += "default: \n";
                } else {
                    output += `case ${expr.split(" | ").join(`:\n${this.depth+"\t"}case `)}: \n`;
                }

                output += this.depth+"\t\t" + this.stmt(arm.body);
            }
            output += this.depth + "}";
        } else if (expr.kind === ExprKind.Block) {
            output += `{\n`;

            this.depth += "\t";

            for (const s of expr.stmts) {
                output += this.stmt(s);
            }
            
            this.depth = this.depth.slice(0, -1);
            for (const i in this.structs) {
                if (this.structs[i] > this.depth.length) {
                    delete this.structs[i];
                }
            }

            output += this.depth+`}`;
        } else if (expr.kind === ExprKind.GetField) {
            output += `${this.expr(expr.expr)}.${expr.field.value}`;
        } else if (expr.kind === ExprKind.GetIndex) {
            output += `${expr.expr}[${expr.index}]`;
        } else if (expr.kind === ExprKind.Lambda) { // @TODO Parse lamdas
            // output += expr.
        } else if (expr.kind === ExprKind.Unary) {
            output += expr.operator.value+this.expr(expr.expr);
        } else if (expr.kind === ExprKind.Binary) {
            output += `${
                this.expr(expr.left)
            } ${expr.operator.value} ${
                this.expr(expr.right)
            }`;
        } else if (expr.kind === ExprKind.Group) {
            output += `(${this.expr(expr.expr)})`;
        } else if (expr.kind === ExprKind.If) {
            output += `if (${this.expr(expr.condition)}) ${
                this.expr(expr.then)
            }`;

            if (expr.else) {
                output += " else ";
                output += this.expr(expr.else);
            }
        } else if (expr.kind === ExprKind.Object) {
            output += "{\n";
            for (const prop of expr.props) {
                output += this.depth+"\t";
                output += `${prop.key.value}: ${this.expr(prop.value)},\n`;
            }
            output += this.depth;
            output += "}";
        } else if (expr.kind == ExprKind.Path) {
            output += this.expr(expr.left);
            output += ".";
            output += this.expr(expr.right);
        }

        return output;
    }

    type(t: Type): string {
        if (t.kind === TypeKind.String) {
            // if (t.value === "str") {
            //     return "string";
            // } else {
            //     return t.value;
            // }
            return t.value;
        } else if (t.kind === TypeKind.Ident) {
            if (t.value === "str") {
                return "string";
            } else if (t.value === "Self") {
                return "self";
            } else if (this.structs[t.value] <= this.depth.length) {
                return decapitalize(t.value);
            } else {
                return t.value;
            }
        } else {
            return t.value + "";
        }
    }
}
