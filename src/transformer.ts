import {
    AST,

    BlockExpr,
    FalsyExpr,

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
        if (stmt.kind === StmtKind.Return) {
            if (stmt.expr?.kind === ExprKind.Match) {
                const arms: SwitchArm[] = [];
                for (const arm of stmt.expr.arms) {
                    arms.push({
                        body: {
                            kind: stmt.kind,
                            expr: arm.body,
                            span: arm.span,
                        },
                        expr: arm.expr,
                        span: arm.span,
                    });
                }

                return {
                    kind: stmt.kind,
                    expr: {
                        kind: ExprKind.Switch,
                        arms: arms,
                        expr: stmt.expr.expr,
                        span: stmt.expr.span,
                    },
                    span: stmt.span,
                };
            } else {
                return stmt;
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

            return {
                kind: stmt.kind,
                name: stmt.name,
                fields: stmt.fields,
                span: stmt.span,
            };
        } else if (stmt.kind === StmtKind.Expr) {
            const expr = this.expr(stmt.expr);
            if (isError(expr)) return expr;

            return {
                kind: stmt.kind,
                expr: expr,
                span: stmt.span,
            };
        } else if (stmt.kind === StmtKind.While) {
            const condition = this.expr(stmt.condition);
            if (isError(condition)) return condition;
            
            const block = this.expr(stmt.block);
            if (isError(block)) return block;

            return {
                kind: stmt.kind,
                condition: condition,
                block: block as BlockExpr,
                span: stmt.span,
            };
        } else if (stmt.kind === StmtKind.For) {
            const iter = this.expr(stmt.iter);
            if (isError(iter)) return iter;
            
            const block = this.expr(stmt.block);
            if (isError(block)) return block;

            return {
                kind: stmt.kind,
                name: stmt.name,
                iter: iter,
                block: block as BlockExpr,
                span: stmt.span,
            };
        } else if (stmt.kind === StmtKind.Let) {
            const init = this.expr(stmt.init);
            if (isError(init)) return init;

            return {
                kind: stmt.kind,
                name: stmt.name,
                type: stmt.type,
                init: init,
                mut: stmt.mut,
                span: stmt.span,
            };
        } else if (stmt.kind === StmtKind.Const) {
            const init = this.expr(stmt.init);
            if (isError(init)) return init;

            return {
                kind: stmt.kind,
                name: stmt.name,
                type: stmt.type,
                init: init,
                span: stmt.span,
            };
        } else if (stmt.kind === StmtKind.Fn) {
            const block = this.expr(stmt.block);
            if (isError(block)) return block;

            return {
                kind: stmt.kind,
                type: stmt.type,
                block: block as BlockExpr,
                span: stmt.span,
            };
        } else if (stmt.kind === StmtKind.Impl) {
            const methods: typeof stmt.methods = [];
            for (const meth of stmt.methods) {
                const b = this.expr(meth.block);
                if (isError(b)) return b;

                methods.push({
                    kind: meth.kind,
                    type: meth.type,
                    block: b as BlockExpr,
                    span: meth.span,
                });
            }

            return {
                kind: stmt.kind,
                impl_name: stmt.impl_name,
                for_name: stmt.for_name,
                methods: methods,
                span: stmt.span,
            };
        } else if (stmt.kind === StmtKind.Trait) {
            const methods: typeof stmt.methods = [];
            for (const meth of stmt.methods) {
                const b = meth.block ? this.expr(meth.block) : undefined;
                if (isError(b)) return b;

                methods.push({
                    type: meth.type,
                    block: b as BlockExpr,
                });
            }

            return {
                kind: stmt.kind,
                name: stmt.name,
                methods: methods,
                span: stmt.span,
            };
        } else if (stmt.kind === StmtKind.Assign) {
            const expr = this.expr(stmt.expr);
            if (isError(expr)) return expr;

            const value = this.expr(stmt.value);
            if (isError(value)) return value;

            return {
                kind: stmt.kind,
                expr: expr as typeof stmt.expr,
                operator: stmt.operator,
                value: value,
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
                const e = this.expr(arm.body);
                if (isError(e)) return e;

                const body = this.expr(arm.body);
                if (isError(body)) return body;

                arms.push({
                    expr: e,
                    body: {
                        kind: StmtKind.Expr,
                        expr: body,
                        span: body.span
                    },
                    span: arm.span,
                });
            }

            const e = this.expr(expr.expr);
            if (isError(e)) return e;

            return {
                kind: ExprKind.Switch,
                expr: e,
                arms: arms,
                span: expr.span,
            };
        } else if (expr.kind === ExprKind.Call) {
            let struct;

            for (let level = this.scope_level; level >= 0; -- level) {
                const scope = this.scopes[level];

                if (expr.func.kind === ExprKind.Ident) {
                    const ident = expr.func.ident.value;
                    struct = scope.structs.find(s => s.name === ident);
                }

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
                    };
                }

                return this.expr(expr.args[0]);
            }

            const args: typeof expr.args = [];
            for (const a of expr.args) {
                const arg = this.expr(a);
                if (isError(arg)) return arg;
                args.push(a);
            }

            const func = this.expr(expr.func);
            if (isError(func)) return func;
            
            return {
                kind: expr.kind,
                args: args,
                func: func,
                span: expr.span,
            };
        } else if (expr.kind === ExprKind.Object) {
            const props: typeof expr.props = [];
            for (const p of expr.props) {
                const v = this.expr(p.value);
                if (isError(v)) return v;

                props.push({
                    key: p.key,
                    value: v,
                });
            }

            return {
                kind: expr.kind,
                props: props,
                span: expr.span,
            };
        } else if (expr.kind === ExprKind.GetField) {
            const e = this.expr(expr.expr);
            if (isError(e)) return e;

            return {
                kind: expr.kind,
                expr: e,
                field: expr.field,
                span: expr.span,
            };
        } else if (expr.kind === ExprKind.GetIndex) {
            const e = this.expr(expr.expr);
            if (isError(e)) return e;

            const index = this.expr(expr.expr);
            if (isError(index)) return index;

            return {
                kind: expr.kind,
                expr: e,
                index: index,
                span: expr.span,
            };
        } else if (expr.kind === ExprKind.Lambda) {
            const block = this.expr(expr.block);
            if (isError(block)) return block;

            return {
                kind: expr.kind,
                params: expr.params,
                return_type: expr.return_type,
                block: block as BlockExpr,
                span: expr.span,
            };
        } else if (expr.kind === ExprKind.Unary) {
            const e = this.expr(expr.expr);
            if (isError(e)) return e;

            return {
                kind: expr.kind,
                operator: expr.operator,
                expr: e,
                span: expr.span,
            };
        } else if (expr.kind === ExprKind.Binary) {
            const l = this.expr(expr.left);
            if (isError(l)) return l;

            const r = this.expr(expr.left);
            if (isError(r)) return r;

            return {
                kind: expr.kind,
                operator: expr.operator,
                left: l,
                right: r,
                span: expr.span,
            };
        } else if (expr.kind === ExprKind.Group) {
            const e = this.expr(expr.expr);
            if (isError(e)) return e;

            return {
                kind: expr.kind,
                expr: e,
                span: expr.span,
            };
        } else if (expr.kind === ExprKind.Switch) { // Shouldn't happen, but just in case
            const arms: SwitchArm[] = [];

            for (const arm of expr.arms) {
                const body = this.stmt(arm.body);
                if (isError(body)) return body;

                arms.push({
                    expr: arm.expr,
                    body: body,
                    span: arm.span,
                });
            }

            const e = this.expr(expr.expr);
            if (isError(e)) return e;

            return {
                kind: ExprKind.Switch,
                expr: e,
                arms: arms,
                span: expr.span,
            };
        } else if (expr.kind === ExprKind.If) {
            const condition = this.expr(expr.condition);
            if (isError(condition)) return condition;
            
            const then = this.expr(expr.condition);
            if (isError(then)) return then;

            const e = expr.else ? this.expr(expr.else) : undefined;
            if (isError(e)) return e;

            return {
                kind: expr.kind,
                condition: then as FalsyExpr,
                then: then as BlockExpr,
                else: e as typeof expr.else,
                span: expr.span,
            };
        }
        

        return expr;
    }
}
