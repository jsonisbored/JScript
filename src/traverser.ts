import {
    AST,

    Expr,
    ExprKind,

    Result,

    Stmt,
    StmtKind,

    Error,
} from "./lib.ts";


type Visitors = {
    stmt: Record<StmtKind, (t: Stmt) => Stmt>,
    expr: Record<ExprKind, (t: Expr) => Expr>,
};

export class Traverser {
    ast: AST;
    visitors: Visitors;
    errors: Error[] = [];

    constructor(ast: AST, visitors: Visitors) {
        this.ast = ast;
        this.visitors = visitors;
        
        return this;
    }

    public traverse() {
        for (const i in this.ast.stmts) {
            const stmt = this.ast.stmts[i];
            
            const method = this.visitors.stmt[stmt.kind];
            if (method) method(stmt);
            
            this.expr_from_stmt(stmt);
        }
    }

    private expr_from_stmt(stmt: Stmt) {
        let expr: Expr | undefined;

        if (stmt.kind === StmtKind.Expr) {
            expr = stmt.expr;
        } else if (stmt.kind === StmtKind.Return) {
            expr = stmt.expr;
        } else if (stmt.kind === StmtKind.While) {
            expr = stmt.condition;

            for (const b of stmt.block.stmts) {
                this.expr_from_stmt(b);
            }
        } else if (stmt.kind === StmtKind.For) {
            expr = stmt.iter;
        } else if (stmt.kind === StmtKind.Let) {
            expr = stmt.init;
        } else if (stmt.kind === StmtKind.Const) {
            expr = stmt.init;
        } else if (stmt.kind === StmtKind.Fn) {
            for (const b of stmt.block.stmts) {
                this.expr_from_stmt(b);
            }
        } else if (stmt.kind === StmtKind.Impl) {
            for (const m of stmt.methods) {
                for (const b of m.block?.stmts) {
                    this.expr_from_stmt(b);
                }
            }
        } else if (stmt.kind === StmtKind.Assign) {
            this.visitors.expr[stmt.expr.kind](stmt.expr);

            expr = stmt.value;
        }

        if (expr) {
            this.visitors.expr[expr.kind](expr);
        }
    }
}
