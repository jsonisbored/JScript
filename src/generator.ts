import {
    AST,
    Expr,
    Stmt,
    StmtKind,
    ExprKind,
} from "./types/mod.ts";


export class Generator {
    private ast: AST;
    private depth = "";

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
                stmt.name.value}: ${stmt.type.value} = ${this.expr(stmt.init)};\n`;
        } else if (stmt.kind === StmtKind.Const) {
            output += `const ${stmt.name.value}: ${stmt.type.value} = ${this.expr(stmt.init)};\n`;
        } else if (stmt.kind === StmtKind.Expr) {
            output += `${this.expr(stmt.expr)};\n`;
        } else if (stmt.kind === StmtKind.Break) {
            output += `break;\n`;
        } else if (stmt.kind === StmtKind.Continue) {
            output += `continue;\n`;
        } else if (stmt.kind === StmtKind.Return) {
            output += `return`;

            if (stmt.expr) {
                output += " "+this.expr(stmt.expr);
            }

            output += ";\n";
        } else if (stmt.kind === StmtKind.While) {
            output += `while (${this.expr(stmt.condition)}) ${
                this.expr(stmt.block)
            }`;
        } else if (stmt.kind === StmtKind.For) {
            output += `for (const ${stmt.name} of ${stmt.iter}) ${
                this.expr(stmt.block)
            }`;
        } else if (stmt.kind === StmtKind.Fn) {
            output += `function ${stmt.type.name.value}(${
                stmt.type.params.map(param => `${param.name.value}: ${param.type.value}`).join(", ")
            }): ${stmt.type.return_type?.value} ${
                this.expr(stmt.block)
            }`;
        } else if (stmt.kind === StmtKind.Impl) {
            output += `const ${stmt.impl_name.value} = {\n`;
            
            for (const m of stmt.methods) {
                output += this.depth+"\t" + m.type.name.value + "(";
                output += m.type.params.map(p => p.name.value).join(", ");
                output += `): ${m.type.return_type?.value} `;

                    this.depth += "\t";
                    output += this.expr(m.block);
                    this.depth = this.depth.slice(0, -1);

                output += "\n";
            }

            output += this.depth + "};\n";
        } else if (stmt.kind === StmtKind.Struct) {
            output += `type ${stmt.name.value} = {\n`;
            for (const f of stmt.fields) {
                output += `${this.depth}\t${f.name.value}: ${f.type.value},\n`;
            }
            output += this.depth + "};\n";
        }

        return output;
    }

    expr(expr: Expr): string {
        let output = "";

        if (expr.kind === ExprKind.Call) {
            output += this.expr(expr.func) + `(${expr.args.map(e => this.expr(e)).join(", ")})`;
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
                output += this.expr(expr.else);
            }
        } else if (expr.kind === ExprKind.Object) {
            output += "{\n";
            for (const prop of expr.props) {
                output += this.depth+"    ";
                output += `${prop.key.value}: ${this.expr(prop.value)},`;
            }
            output += this.depth;
            output += "\n}";
        } else if (expr.kind == ExprKind.Path) {
            output += this.expr(expr.left);
            output += ".";
            output += this.expr(expr.right);
        }

        return output;
    }
}
