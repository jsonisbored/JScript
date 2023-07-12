import {
    Token,
    Type,
    TypeKind,
    Stmt,
    Span,
} from "./mod.ts";


export enum ExprKind {
    Boolean         = "Boolean",
    Number          = "Number",
    String          = "String",
    Call            = "Call",
    CallStruct      = "CallStruct",
    GetField        = "GetProp",
    GetIndex        = "GetIndex",
    Lambda          = "Lambda",
    Unary           = "Unary",
    Binary          = "Binary",
    TypeCast        = "TypeCast",
    Group           = "Group",
    Match           = "Match",
    Switch          = "Switch",
    Ident           = "Ident",
    Block           = "Block",
    Object          = "Object",
    If              = "If",
    Macro           = "Macro",
}

export interface BooleanExpr {
    kind: ExprKind.Boolean,
    value: boolean,
    span: Span,
}
export interface NumberExpr {
    kind: ExprKind.Number,
    value: number,
    span: Span,
}
export interface StringExpr {
    kind: ExprKind.String,
    value: string,
    span: Span,
}
export interface CallExpr {
    kind: ExprKind.Call,
    func: Expr,
    args: Expr[],
    span: Span,
}
export interface CallInterfaceExpr {
    kind: ExprKind.CallStruct,
    interface: Expr,
    args: {
        name: Token,
        type: Type,
    }[],
    span: Span,
}
export interface ObjectExpr {
    kind: ExprKind.Object,
    props: {
        key: Token,
        value: Expr,
    }[],
    span: Span,
}
export interface GetFieldExpr {
    kind: ExprKind.GetField,
    expr: Expr,
    field: Token,
    span: Span,
}
export interface GetIndexExpr {
    kind: ExprKind.GetIndex,
    expr: Expr,
    index: Expr,
    span: Span,
}
export type Param = {
    name: Token,
    type: Type,
    span: Span,
}
export interface LambdaExpr {
    kind: ExprKind.Lambda,
    params: Param[],
    return_type: Type,
    block: BlockExpr,
    span: Span,
}
export interface UnaryExpr {
    kind: ExprKind.Unary,
    operator: Token,
    expr: Expr,
    span: Span,
}
export interface BinaryExpr {
    kind: ExprKind.Binary,
    left: Expr,
    operator: Token,
    right: Expr,
    span: Span,
}
export interface TypeCastExpr {
    kind: ExprKind.TypeCast,
    expr: Expr,
    type: TypeKind,
    span: Span,
}
export interface GroupExpr {
    kind: ExprKind.Group,
    expr: Expr,
    span: Span,
}
export interface MatchArm {
    expr: Expr,
    body: Expr,
    span: Span,
}
export interface MatchExpr {
    kind: ExprKind.Match,
    expr: Expr,
    arms: MatchArm[],
    default?: Expr,
    span: Span,
}
export interface SwitchArm {
    expr: Expr,
    body: Stmt,
    span: Span,
}
export interface SwitchExpr {
    kind: ExprKind.Switch,
    expr: Expr,
    arms: SwitchArm[],
    span: Span,
}
export interface IdentExpr {
    kind: ExprKind.Ident,
    ident: Token,
    span: Span,
}
export interface BlockExpr {
    kind: ExprKind.Block,
    stmts: Stmt[],
    span: Span,
}
export interface IfExpr {
    kind: ExprKind.If,
    condition: FalsyExpr,
    then: BlockExpr,
    else?: IfExpr | BlockExpr,
    span: Span,
}
export interface MacroExpr {
    kind: ExprKind.Macro,
    name: Token,
    expr: Expr,
    span: Span,
}


export type FalsyExpr =
    | BooleanExpr
    | IdentExpr
    | CallExpr
    | BlockExpr
    | GetFieldExpr
    | GetIndexExpr
    | UnaryExpr
    | BinaryExpr
    | GroupExpr;

export type Expr =
    | BooleanExpr
    | NumberExpr
    | StringExpr
    | CallExpr
    | CallInterfaceExpr
    | ObjectExpr
    | GetFieldExpr
    | GetIndexExpr
    | LambdaExpr
    | UnaryExpr
    | BinaryExpr
    | TypeCastExpr
    | GroupExpr
    | MatchExpr
    | SwitchExpr
    | IdentExpr
    | BlockExpr
    | IfExpr
    | MacroExpr;
