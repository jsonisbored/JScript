import {
    AST,

    BlockExpr,

    Expr,
    ExprKind,

    Result,

    Stmt,
    StmtKind,
    SwitchArm,

    isError,
    Error,
    ErrorKind,
    ErrorOrigin,
} from "./lib.ts";

interface Scope {
    structs: Array<{ name: string }>,
}


export class Transformer {
    ast: AST;
    errors: Error[] = [];

    private scopes: Scope[] = [{ structs: [] }];
    private scope_level = 0;

    constructor(ast: AST) {
        this.ast = ast;
        return this;
    }

    public transform(): { errors: Error[], ast: AST } {
        const new_ast: AST = {
            stmts: [],
        };

        for (const stmt of this.ast.stmts) {
            const new_stmt = this.stmt(stmt);

            if (isError(new_stmt)) {
                this.errors.push(new_stmt);
                continue;
            }

            new_ast.stmts.push(new_stmt);
        }

        return {
            errors: this.errors,
            ast: new_ast,
        };
    }

    private stmt(stmt: Stmt): Result<Stmt> {
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
        } else if (stmt.kind === StmtKind.Struct) {
            let struct;
            for (let level = this.scope_level; level >= 0; level --) {
                const scope = this.scopes[level];
                struct = scope.structs.find(s => s.name === stmt.name.value);
                if (struct) {
                    break;
                }
            }

            if (!struct) {
                this.scopes[this.scope_level].structs.push({
                    name: stmt.name.value,
                });
            } else {
                console.log("struct already exists");
            }
        } else if (stmt.kind === StmtKind.Expr) {
            const expr = this.expr(stmt.expr);
            if (isError(expr)) return expr;

            return {
                kind: stmt.kind,
                expr: expr,
                span: stmt.span,
            };
        }

        return stmt;
    }

    private expr(expr: Expr): Result<Expr> {
        if (expr.kind === ExprKind.Block) {
            const stmts = [];

            for (let i = 0; i < expr.stmts.length; i ++) {
                const new_stmt = this.stmt(expr.stmts[i]);

                if (isError(new_stmt)) {
                    this.errors.push(new_stmt);
                    continue;
                }

                stmts.push(new_stmt);
            }

            return {
                kind: ExprKind.Block,
                stmts: stmts,
                span: expr.span,
            };
        } else if (expr.kind === ExprKind.Match) {
            const arms: SwitchArm[] = [];

            for (const arm of expr.arms) {
                arms.push({
                    expr: arm.expr,
                    body: {
                        kind: StmtKind.Expr,
                        expr: arm.body,
                        span: arm.body.span
                    },
                    span: arm.span,
                });
            }

            return {
                kind: ExprKind.Switch,
                expr: expr.expr,
                arms: arms,
                span: expr.span,
            };
        } else if (expr.kind === ExprKind.Call) {
            let struct;

            for (let level = this.scope_level; level >= 0; -- level) {
                const scope = this.scopes[level];

                struct = scope.structs.find(s => 
                    expr.func.kind === ExprKind.Ident && 
                    s.name === expr.func.ident.value);

                if (struct) {
                    break;
                }
            }

            if (struct) {
                if (expr.args[0].kind !== ExprKind.Object) {
                    return {
                        origin: ErrorOrigin.Transformer,
                        kind: ErrorKind.UpdateLater,
                        message: "expected object",
                        position: expr.args[0].span.start,
                    }
                }

                return expr.args[0];
            }

            return expr;
        }

        return expr;
    }
}
