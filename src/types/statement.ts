import {
    Token,
    Type,
    Expr,
    BlockExpr,
    IdentifierExpr,
    GetFieldExpr,
    GetIndexExpr,
} from "./mod.ts";


export enum StmtKind {
    Break       = "Break",
    Continue    = "Continue",
    Expr        = "Expr",
    Return      = "Return",
    While       = "While",
    For         = "For",
    Let         = "Let",
    Const       = "Const",
    Function    = "Function",
    Enum        = "Enum",
    Struct      = "Struct",
    Impl        = "Impl",
    Trait       = "Trait",
    Assign      = "Assign",
}

export interface BreakStmt {
    kind: StmtKind.Break;
}
export interface ContinueStmt {
    kind: StmtKind.Continue;
}
export interface ExprStmt {
    kind: StmtKind.Expr;
    expr: Expr;
}
export interface ReturnStmt {
    kind: StmtKind.Return;
    expr?: Expr;
}
export interface WhileStmt {
    kind: StmtKind.While;
    condition: Expr;
    block: BlockExpr;
}
export interface ForStmt {
    kind: StmtKind.For;
    name: Token;
    iter: Expr;
    block: BlockExpr;
}
export interface LetStmt {
    kind: StmtKind.Let;
    name: Token;
    init: Expr;
    type: Type;
    mut: boolean;
}
export interface ConstStmt {
    kind: StmtKind.Const;
    name: Token;
    init: Expr;
    type: Type;
}
export interface FunctionType {
    name: Token;
    params: { name: Token, type: Type, mut: boolean }[];
    return_type?: Type;
}
export interface FunctionStmt {
    kind: StmtKind.Function;
    type: FunctionType;
    block: BlockExpr;
}
export interface EnumStmt {
    kind: StmtKind.Enum;
    name: Token;
    fields: {
        name: Token;
        types: Type[];
    }[];
}
export interface StructStmt {
    kind: StmtKind.Struct;
    name: Token;
    fields: {
        name: Token;
        type: Type;
    }[];
}
export interface ImplStmt {
    kind: StmtKind.Impl;
    impl_name: Token;
    for_name?: Token;
    methods: FunctionStmt[];
}
export interface TraitStmt {
    kind: StmtKind.Trait;
    name: Token;
    methods: {
        type: FunctionType;
        block?: BlockExpr;
    }[];
}
export interface AssignStmt {
    kind: StmtKind.Assign;
    expr: GetFieldExpr | GetIndexExpr | IdentifierExpr;
    operator: Token,
    value: Expr;
}

export type Stmt =
    | BreakStmt
    | ContinueStmt
    | ExprStmt
    | ReturnStmt
    | WhileStmt
    | ForStmt
    | LetStmt
    | ConstStmt
    | FunctionStmt
    | EnumStmt
    | StructStmt
    | ImplStmt
    | TraitStmt
    | AssignStmt;