import {
    AST,
    Expr,
    Stmt,
    StmtKind,
    ExprKind,
} from "./types/mod.ts";


export class Generator {
    private ast: AST;
    private depth = 0;

    constructor(ast: AST) {
        this.ast = ast;
    }

    generate(): string {
        let output = "";
        for (const stmt of this.ast.stmts) {
            output += this.stmt(stmt) + "\n";
        }

        return output;
    }

    stmt(stmt: Stmt): string {
        let output = "    ".repeat(this.depth);

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
                output += "    ".repeat(this.depth+1);

                const expr = this.expr(arm.expr);
                if (expr === "_") {
                    output += "default: \n";
                } else {
                    output += `case ${expr.split(" | ").join(`:\n${"    ".repeat(this.depth+1)}case `)}: \n`;
                }

                output += "    ".repeat(this.depth+2) + this.stmt(arm.body);
            }
            output += "    ".repeat(this.depth)+"}";
        } else if (expr.kind === ExprKind.Block) {
            output += `{\n`;

            this.depth ++;

            for (const s of expr.stmts) {
                output += this.stmt(s);
            }
            
            this.depth --;

            output += "    ".repeat(this.depth)+`}`;
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
                output += "    ".repeat(this.depth+1);
                output += `${prop.key.value}: ${this.expr(prop.value)},`;
            }
            output += "    ".repeat(this.depth);
            output += "\n}";
        }

        return output;
    }
}
