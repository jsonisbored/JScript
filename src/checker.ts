import {
    ErrorOrigin,
    ErrorKind,

    AST,
    Expr,
    Stmt,
    StmtKind,
    ExprKind,
    Error,
    Identifier,
    Result,
    FunctionStmt,
} from "./types/mod.ts";


export class Checker {
    private readonly ast: AST;
    private readonly errors: Error[] = [];

    constructor(ast: AST) {
        this.ast = ast;
    }

    public validate() {
        for (const stmt of this.ast.stmts) {
            for (const stmt2 of this.ast.stmts) {
                if (this.get_decl_ident(stmt) === this.get_decl_ident(stmt2)) {
                    return {
                        origin: ErrorOrigin.Checker,
                        kind: ErrorKind.UpdateLater,
                        message: "Duplicate identifier",
                    };
                }
            }
        }
    }

    private get_decl_ident(stmt: Stmt): Result<string> {
        if (stmt.kind === StmtKind.Function) {
            return stmt.type.name.value;
        } else if (stmt.kind === StmtKind.Let) {
            return stmt.name.value;
        } else if (stmt.kind === StmtKind.Const) {
            return stmt.name.value;
        } else if (stmt.kind === StmtKind.Struct) {
            return stmt.name.value;
        } else if (stmt.kind === StmtKind.Trait) {
            return stmt.name.value;
        }

        return {
            origin: ErrorOrigin.Checker,
            kind: ErrorKind.UpdateLater,
            message: "Not a declaration statement",
        };
        
    }
}