import {
    Token,
    Type,
    Stmt,
} from "./mod.ts";


export enum ExprKind {
    Boolean         = "Boolean",
    Number          = "Number",
    String          = "String",
    Call            = "Call",
    CallInterface   = "CallInterfaceExpr",
    GetField        = "GetProp",
    GetIndex        = "GetIndex",
    Lambda          = "Lambda",
    Unary           = "Unary",
    Binary          = "Binary",
    TypeCast        = "TypeCast",
    Group           = "Group",
    Let             = "Let",
    Assign          = "Assign",
    Match           = "Match",
    Identifier      = "Identifier",
    Block           = "Block",
    If              = "If",
    Macro           = "Macro",
}

export interface BooleanExpr {
    kind: ExprKind.Boolean;
    value: boolean;
}
export interface NumberExpr {
    kind: ExprKind.Number;
    value: number;
}
export interface StringExpr {
    kind: ExprKind.String;
    value: string;
}
export interface CallExpr {
    kind: ExprKind.Call;
    func: Expr;
    args: Expr[];
}
export interface CallInterfaceExpr {
    kind: ExprKind.CallInterface;
    interface: Expr;
    args: {
        name: Token;
        type: Type;
    }[];
}
export interface GetFieldExpr {
    kind: ExprKind.GetField;
    expr: Expr;
    field: Token;
}
export interface GetIndexExpr {
    kind: ExprKind.GetIndex;
    expr: Expr;
    index: Expr;
}
export type Param = {
    name: Token;
    type: Type;
}
export interface LambdaExpr {
    kind: ExprKind.Lambda;
    params: Param[];
    return_type: Type;
    block: BlockExpr;
}
export interface UnaryExpr {
    kind: ExprKind.Unary;
    operator: Token;
    expr: Expr;
}
export interface BinaryExpr {
    kind: ExprKind.Binary;
    left: Expr;
    operator: Token;
    right: Expr;
}
export interface TypeCastExpr {
    kind: ExprKind.TypeCast;
    expr: Expr;
    type: Type;
}
export interface GroupExpr {
    kind: ExprKind.Group;
    expr: Expr;
}
export interface MatchArm {
    expr: Expr;
    body: Expr;
}
export interface MatchExpr {
    kind: ExprKind.Match;
    expr: Expr;
    arms: MatchArm[];
    default?: Expr;
}
export interface IdentifierExpr {
    kind: ExprKind.Identifier,
    ident: Token,
}
export interface BlockExpr {
    kind: ExprKind.Block;
    stmts: Stmt[];
}
export interface IfExpr {
    kind: ExprKind.If;
    condition: FalsyExpr;
    then: BlockExpr;
    else?: IfExpr | BlockExpr;
}
export interface MacroExpr {
    kind: ExprKind.Macro;
    name: Token;
    expr: Expr;
}


export type FalsyExpr =
    | BooleanExpr
    | IdentifierExpr
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
    | GetFieldExpr
    | GetIndexExpr
    | LambdaExpr
    | UnaryExpr
    | BinaryExpr
    | TypeCastExpr
    | GroupExpr
    | MatchExpr
    | IdentifierExpr
    | BlockExpr
    | IfExpr
    | MacroExpr;
