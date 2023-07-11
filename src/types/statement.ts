import {
    Token,
    Type,
    Expr,
    BlockExpr,
    IdentExpr,
    GetFieldExpr,
    GetIndexExpr,
    Span,
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
    Fn          = "Fn",
    Enum        = "Enum",
    Struct      = "Struct",
    Impl        = "Impl",
    Trait       = "Trait",
    Assign      = "Assign",
}

export interface BreakStmt {
    kind: StmtKind.Break,
    span: Span,
}
export interface ContinueStmt {
    kind: StmtKind.Continue,
    span: Span,
}
export interface ExprStmt {
    kind: StmtKind.Expr,
    expr: Expr,
    span: Span,
}
export interface ReturnStmt {
    kind: StmtKind.Return,
    expr?: Expr,
    span: Span,
}
export interface WhileStmt {
    kind: StmtKind.While,
    condition: Expr,
    block: BlockExpr,
    span: Span,
}
export interface ForStmt {
    kind: StmtKind.For,
    name: Token,
    iter: Expr,
    block: BlockExpr,
    span: Span,
}
export interface LetStmt {
    kind: StmtKind.Let,
    name: Token,
    type: Type,
    init: Expr,
    mut: boolean,
    span: Span,
}
export interface ConstStmt {
    kind: StmtKind.Const,
    name: Token,
    init: Expr,
    type: Type,
    span: Span,
}
export interface FunctionType {
    name: Token,
    params: { name: Token, type: Type, mut: boolean }[],
    return_type: Type | null,
    span: Span,
}
export interface FnStmt {
    kind: StmtKind.Fn,
    type: FunctionType,
    block: BlockExpr,
    span: Span,
}
export interface EnumStmt {
    kind: StmtKind.Enum,
    name: Token,
    fields: {
        name: Token,
        types: Type[],
    }[],
    span: Span,
}
export interface StructStmt {
    kind: StmtKind.Struct,
    name: Token,
    fields: {
        name: Token,
        type: Type,
    }[],
    span: Span,
}
export interface ImplStmt {
    kind: StmtKind.Impl,
    impl_name: Token,
    for_name?: Token,
    methods: FnStmt[],
    span: Span,
}
export interface TraitStmt {
    kind: StmtKind.Trait,
    name: Token,
    methods: {
        type: FunctionType,
        block?: BlockExpr,
    }[],
    span: Span,
}
export interface AssignStmt {
    kind: StmtKind.Assign,
    expr: GetFieldExpr | GetIndexExpr | IdentExpr,
    operator: Token,
    value: Expr,
    span: Span,
}


export type DeclStmt =
    | LetStmt
    | ConstStmt
    | FnStmt
    | EnumStmt
    | StructStmt
    | ImplStmt
    | TraitStmt;

export type Stmt =
    | BreakStmt
    | ContinueStmt
    | ExprStmt
    | ReturnStmt
    | WhileStmt
    | ForStmt
    | LetStmt
    | ConstStmt
    | FnStmt
    | EnumStmt
    | StructStmt
    | ImplStmt
    | TraitStmt
    | AssignStmt;