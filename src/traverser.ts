import {
    AST,

    Expr,
    ExprKind,

    Result,

    Stmt,
    StmtKind,

    Error,
} from "./lib.ts";


export class Traverser {
    ast: AST;
    errors: Error[] = [];

    constructor(ast: AST) {
        this.ast = ast;
        return this;
    }

    traverse_stmt(stmt_kind: StmtKind, method: (stmt: Stmt) => Stmt): Result<void> {
        for (const i in this.ast.stmts) {
            const stmt = this.ast.stmts[i];
            
            if (stmt.kind === stmt_kind) {
                this.ast.stmts[i] = method(stmt);
            }
        }
    }

    traverse_expr(expr_kind: ExprKind, method: (expr: Expr) => Expr): Result<void> {
        for (const i in this.ast.stmts) {
            const stmt = this.ast.stmts[i];
            this.find_expr(stmt, expr_kind, method);
        }
    }

    private find_expr(stmt: Stmt, expr_kind: ExprKind, method: (expr: Expr) => Expr) {
        let expr: Expr | undefined;

        if (stmt.kind === StmtKind.Expr) {
            expr = stmt.expr;
        } else if (stmt.kind === StmtKind.Return) {
            expr = stmt.expr;
        } else if (stmt.kind === StmtKind.While) {
            expr = stmt.condition;

            if (stmt.block.kind === expr_kind) {
                for (const b of stmt.block.stmts) {
                    this.find_expr(b, expr_kind, method);
                }
            }
        } else if (stmt.kind === StmtKind.For) {
            expr = stmt.iter;
        } else if (stmt.kind === StmtKind.Let) {
            expr = stmt.init;
        } else if (stmt.kind === StmtKind.Const) {
            expr = stmt.init;
        } else if (stmt.kind === StmtKind.Fn) {
            if (stmt.block.kind === expr_kind) {
                for (const b of stmt.block.stmts) {
                    this.find_expr(b, expr_kind, method);
                }
            }
        } else if (stmt.kind === StmtKind.Impl) {
            for (const m of stmt.methods) {
                for (const b of m.block?.stmts) {
                    this.find_expr(b, expr_kind, method);
                }
            }
        } else if (stmt.kind === StmtKind.Assign) {
            if (stmt.expr.kind === expr_kind) {
                method(stmt.expr);
            }

            expr = stmt.value;
        }

        
        if (expr?.kind === expr_kind) {
            method(expr);
        }
    }
}
