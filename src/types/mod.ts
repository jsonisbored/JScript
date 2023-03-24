export * from "./token.ts";
export * from "./error.ts";
export * from "./type.ts";
export * from "./statement.ts";
export * from "./expression.ts";


import { Stmt } from "./statement.ts";

export interface Span {
    start: number;
    end: number;
}

export interface AST {
    stmts: Stmt[],
}
