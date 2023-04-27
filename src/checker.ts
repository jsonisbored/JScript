import {
    ErrorOrigin,
    ErrorKind,
    isError,
    Result,

    AST,

    TypeKind,
    Type,
    Number,
    String,

    ExprKind,
    Expr,
    CallExpr,
    CallInterfaceExpr,
    GetFieldExpr,
    GetIndexExpr,
    LambdaExpr,
    UnaryExpr,
    BinaryExpr,
    TypeCastExpr,
    GroupExpr,
    MatchExpr,
    IdentExpr,
    BlockExpr,
    IfExpr,
    MacroExpr,

    StmtKind,
    Stmt,
    DeclStmt,
    FnStmt,

    TokenKind,
} from "./types/mod.ts";


export class Checker {
    private expr(expr: Expr): Result<TypeKind> {
        if (expr.kind === ExprKind.Ident) {
            return this.ident(expr);
        } else if (expr.kind === ExprKind.Call) {
            return this.call(expr);
        } else if (expr.kind === ExprKind.Binary) {
            return this.binary(expr);
        } else if (expr.kind === ExprKind.Group) {
            return this.group(expr);
        }

        return {
            origin: ErrorOrigin.Checker,
            kind: ErrorKind.UpdateLater,
            message: "Unknown expression type",
        };
    }

    private call(expr: CallExpr): Result<TypeKind> {
        const func = this.expr(expr.func);
    }

    private call_interface(expr: CallInterfaceExpr): Result<TypeKind> {

    }
    
    private get_field(expr: GetFieldExpr): Result<TypeKind> {
        
    }
    
    private get_index(expr: GetIndexExpr): Result<TypeKind> {
        
    }

    private lambda(expr: LambdaExpr): Result<TypeKind> {
        
    }

    private unary(expr: UnaryExpr): Result<TypeKind> {

    }

    private binary(expr: BinaryExpr): Result<TypeKind> {
        const left = this.expr(expr.left);
        if (isError(left)) return left;
        const right = this.expr(expr.right);
        if (isError(right)) return right;

        if (left !== TypeKind.String && left !== TypeKind.Number) {
            return {
                origin: ErrorOrigin.Checker,
                kind: ErrorKind.UpdateLater,
                message: "Incompatible types",
            };
        }

        if (left === right) {
            const operator_types: Partial<Record<TokenKind, TypeKind[]>> = {
                [TokenKind.LogicAnd]: [TypeKind.Boolean],
                [TokenKind.LogicOr]: [TypeKind.Boolean],
                [TokenKind.BitwiseXor]: [TypeKind.Boolean],
                [TokenKind.BitwiseOr]: [TypeKind.Boolean],
                [TokenKind.BitwiseAnd]: [TypeKind.Boolean],
                [TokenKind.BangEqual]: [TypeKind.Boolean],
                [TokenKind.EqualEqual]: [TypeKind.Boolean],
                [TokenKind.Greater]: [TypeKind.Boolean],
                [TokenKind.GreaterEqual]: [TypeKind.Boolean],
                [TokenKind.Less]: [TypeKind.Boolean],
                [TokenKind.LessEqual]: [TypeKind.Boolean],

                [TokenKind.Plus]: [TypeKind.Number, TypeKind.String],

                [TokenKind.Minus]: [TypeKind.Boolean],
                [TokenKind.Asterisk]: [TypeKind.Boolean],
                [TokenKind.Slash]: [TypeKind.Boolean],
                [TokenKind.Modulus]: [TypeKind.Number],
                [TokenKind.DotDot]: [TypeKind.Boolean],
                [TokenKind.DotDotEqual]: [TypeKind.Number],
            };

            const type = operator_types[expr.operator.kind];
            if (!type) {
                return {
                    origin: ErrorOrigin.Checker,
                    kind: ErrorKind.UpdateLater,
                    message: "Unknown operator type",
                };
            }

            if (type.includes(left)) {
                return left;
            }

            return {
                origin: ErrorOrigin.Checker,
                kind: ErrorKind.UpdateLater,
                message: "Incompatible types",
            };
        }
            
        

        return {
            origin: ErrorOrigin.Checker,
            kind: ErrorKind.UpdateLater,
            message: "Incompatible types",
        };
    }

    private type_cast(expr: TypeCastExpr): Result<TypeKind> {
        
    }

    private group(expr: GroupExpr): Result<TypeKind> {
        return this.expr(expr.expr);
    }

    private match(expr: MatchExpr): Result<TypeKind> {

    }

    private ident(expr: IdentExpr): Result<TypeKind> {

    }

    private block(expr: BlockExpr): Result<TypeKind> {

    }

    private if(expr: IfExpr): Result<TypeKind> {

    }

    private macro(expr: MacroExpr): Result<TypeKind> {

    }
}
