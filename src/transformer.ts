import {
    AST,

    BlockExpr,

    Expr,
    ExprKind,

    Stmt,
    StmtKind,
    SwitchArm,
} from "./lib.ts";


export class Transformer {
    ast: AST;

    constructor(ast: AST) {
        this.ast = ast;
        return this;
    }

    public transform(): AST {
        const new_ast: AST = {
            stmts: [],
        };

        for (const stmt of this.ast.stmts) {
            new_ast.stmts.push(this.stmt(stmt));
        }

        return new_ast;
    }

    private stmt(stmt: Stmt): Stmt {
        if (stmt.kind === StmtKind.Fn) {
            return {
                kind: StmtKind.Fn,
                type: stmt.type,
                block: this.expr(stmt.block) as BlockExpr,
                span: stmt.span,
            };
        } else if (stmt.kind === StmtKind.Return) {
            if (stmt.expr?.kind === ExprKind.Match) {
                const arms: SwitchArm[] = [];
                for (const arm of stmt.expr.arms) {
                    arms.push({
                        body: {
                            kind: StmtKind.Return,
                            expr: arm.body,
                            span: arm.span,
                        },
                        expr: arm.expr,
                        span: arm.span,
                    });
                }

                return {
                    kind: StmtKind.Expr,
                    expr: {
                        kind: ExprKind.Switch,
                        arms: arms,
                        expr: stmt.expr.expr,
                        span: stmt.expr.span,
                    },
                    span: stmt.span,
                };
            }
        }
        return stmt;
    }

    private expr(expr: Expr): Expr {
        if (expr.kind === ExprKind.Block) {
            return {
                kind: ExprKind.Block,
                stmts: expr.stmts.map(s => this.stmt(s)),
                span: expr.span,
            };
        }

        return expr;
    }
}
