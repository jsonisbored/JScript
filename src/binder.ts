import {
    AST,

    Type,
    FunctionType,
    
    Expr,
    
    StmtKind,
    Stmt,

    ExprKind,
} from "./types/mod.ts";


export enum TableKind {
    Let     = "Let",
    Const   = "Const",
    Fn      = "Fn",
    For     = "For",
    If      = "If",
}

export type Table = Record<number, {
    kind: TableKind;
    type?: Type | FunctionType;
    block?: Table;
}>;

export class Binder {
    private readonly ast: AST;

    constructor(ast: AST) {
        this.ast = ast;
    }

    public bind(): Table {
        return this.block(this.ast.stmts);
    }

    private block(block: Stmt[]): Table {
        const table: Table = {};

        for (const node of block) {
            if (node.kind === StmtKind.Let) {
                table[node.span.start] = {
                    kind: TableKind.Let,
                    type: node.type,
                };
            } else if (node.kind === StmtKind.Const) {
                table[node.span.start] = {
                    kind: TableKind.Const,
                    type: node.type,
                };
            } else if (node.kind === StmtKind.Fn) {
                table[node.span.start] = {
                    kind: TableKind.Fn,
                    type: node.type,
                    block: this.block(node.block.stmts),
                };
            } else if (node.kind === StmtKind.For) {
                table[node.span.start] = {
                    kind: TableKind.Fn,
                    block: this.block(node.block.stmts),
                };
            } else if (node.kind === StmtKind.Expr) {
                this.expr(table, node.expr);
            }
        }
        
        return table;
    }

    private expr(parent: Table, expr: Expr) {
        if (expr.kind === ExprKind.If) {
            parent[expr.span.start] = {
                kind: TableKind.If,
                block: this.block(expr.then.stmts),
            };
            
            if (expr.else) {
                this.expr(parent, expr.else);
            }
        } else if (expr.kind === ExprKind.Block) {
            this.block(expr.stmts);
        } else if (expr.kind === ExprKind.Match) {
            for (const arm of expr.arms) {
                this.expr(parent, arm.expr);
            }
        }
    }
    
}