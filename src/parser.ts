import {
    Token,
    Error,
    Result,
    isError,
    ErrorOrigin,
    
    ConstStmt,
    EnumStmt,
    FnStmt,
    ImplStmt,
    Stmt,
    StructStmt,
    TraitStmt,
    LetStmt,
    WhileStmt,
    ForStmt,
    BreakStmt,
    ContinueStmt,
    ReturnStmt,
    ExprStmt, 
    AssignStmt,
    
    FunctionType,
    TokenKind,
    Type,

    ErrorKind,
    StmtKind,
    ExprKind,
    TypeKind,
    
    Expr,
    MatchArm,
    CallExpr,
    IfExpr,
    BlockExpr,

    AST,
    Span,
} from "./types/mod.ts";


export class Parser {
    private readonly tokens: Token[];
    private readonly errors: Error[] = [];
    private start = 0;
    private current = 0;

    private readonly interfaces = new Set<Token>();

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }


    public parse(): {
        ast: AST,
        errors: Error[],
    } {
        const stmts: Stmt[] = [];

        while (this.current < this.tokens.length-1) {
            const decl = this.decl_stmt();
            if (isError(decl)) {
                this.errors.push(decl);
                this.current ++;
            } else {
                stmts.push(decl);
            }
        }

        return {
            ast: {
                stmts,
            },
            errors: this.errors,
        };
    }

    private decl_stmt(): Result<Stmt> {
        let stmt: Result<Stmt> = this.const_decl();
        if (!isError(stmt)) return stmt;
        stmt = this.fn_decl();
        if (!isError(stmt)) return stmt;
        stmt = this.enum_decl();
        if (!isError(stmt)) return stmt;
        stmt = this.type_decl();
        if (!isError(stmt)) return stmt;
        stmt = this.impl_decl();
        if (!isError(stmt)) return stmt;
        stmt = this.trait_decl();
        if (!isError(stmt)) return stmt;
        stmt = this.let_decl();
        if (!isError(stmt)) return stmt;
        
        return this.any_stmt();
    }

    private const_decl(): Result<ConstStmt> {
        if (!this.match(TokenKind.Const)) {
            return this.error(TokenKind.Const);
        }

        const name = this.consume(TokenKind.Ident);
        if (isError(name)) return name;

        const type = this.match(TokenKind.Colon)
            ? this.consume_type()
            : undefined;
        if (isError(type)) return type;
        if (!type) return {
            origin: ErrorOrigin.Parser,
            kind: ErrorKind.UnexpectedToken,
            message: "Expected type declaration",
            position: this.tokens[this.current].span.start,
        }

        const init = this.match(TokenKind.Equal)
            ? this.scalar_expr()
            : this.error(TokenKind.Equal);
        if (isError(init)) return init;

        const semi = this.consume(TokenKind.Semicolon);
        if (isError(semi)) return semi;

        return this.node({
            name,
            kind: StmtKind.Const,
            type,
            init,
        });
    }

    private fn_decl(): Result<FnStmt> {
        if (!this.match(TokenKind.Fn)) {
            return this.error(TokenKind.Fn);
        }

        const type = this.function_type();
        if (isError(type)) return type;

        const block = this.block_expr();
        if (isError(block)) return block;

        return this.node({
            kind: StmtKind.Fn,
            type,
            block,
        });
    }

    private enum_decl(): Result<EnumStmt> {
        if (!this.match(TokenKind.Enum)) {
            return this.error(TokenKind.Enum);
        }

        const name = this.consume(TokenKind.Ident);
        if (isError(name)) return name;

        if (!this.match(TokenKind.LeftBrace)) {
            return this.error(TokenKind.LeftBrace);
        }

        const fields: EnumStmt["fields"] = [];
        while (!this.check(TokenKind.RightBrace)) {
            const name = this.consume(TokenKind.Ident);
            if (isError(name)) return name;

            const types: Type[] = [];
            while (this.check(TokenKind.RightBrace)) {
                const type = this.consume_type();
                if (isError(type)) return type;
                types.push(type);
            }

            if (!this.match(TokenKind.Comma)) {
                return this.error(TokenKind.Comma);
            }

            fields.push({ name, types });
        }

        return this.node({
            kind: StmtKind.Enum,
            name,
            fields,
        });
    }

    private type_decl(): Result<StructStmt> {
        if (!this.match(TokenKind.Type)) {
            return this.error(TokenKind.Type);
        }
        
        const name = this.consume(TokenKind.Ident);
        if (isError(name)) return name;

        this.interfaces.add(name);

        if (!this.match(TokenKind.LeftBrace)) {
            return this.error(TokenKind.LeftBrace);
        }

        const fields: StructStmt["fields"] = [];
        while (!this.check(TokenKind.RightBrace)) {
            const name = this.consume(TokenKind.Ident);
            if (isError(name)) return name;

            if (!this.match(TokenKind.Colon)) {
                return this.error(TokenKind.Colon);
            }

            const type = this.consume_type();
            if (isError(type)) return type;

            if (!this.match(TokenKind.Comma)) {
                return this.error(TokenKind.Comma);
            }

            fields.push({ name, type });
        }

        return this.node({
            kind: StmtKind.Struct,
            name,
            fields,
        });
    }

    private impl_decl(): Result<ImplStmt> {
        if (!this.match(TokenKind.Impl)) {
            return this.error(TokenKind.Impl);
        }
        
        const impl_name = this.consume(TokenKind.Ident);
        if (isError(impl_name)) return impl_name;
        
        const for_name = this.match(TokenKind.For)
            ? this.consume(TokenKind.Ident)
            : undefined;
        if (isError(for_name)) return for_name;
        
        if (!this.match(TokenKind.LeftBrace)) {
            return this.error(TokenKind.LeftBrace);
        }

        const methods: ImplStmt["methods"] = [];
        while (!this.match(TokenKind.RightBrace)) {
            const decl = this.fn_decl();
            if (isError(decl)) return decl;

            methods.push(decl);
        }

        return this.node({
            kind: StmtKind.Impl,
            impl_name,
            for_name,
            methods,
        });
    }

    private trait_decl(): Result<TraitStmt> {
        if (!this.match(TokenKind.Trait)) {
            return this.error(TokenKind.Trait);
        }
        
        const name = this.consume(TokenKind.Ident);
        if (isError(name)) return name;
        
        if (!this.match(TokenKind.LeftBrace)) {
            return this.error(TokenKind.LeftBrace);
        }

        const methods: TraitStmt["methods"] = [];
        while (!this.match(TokenKind.RightBrace)) {
            const type = this.function_type();
            if (isError(type)) return type;

            const block = this.block_expr();
            if (isError(block)) return block;

            methods.push({ type, block });
        }

        return this.node({
            kind: StmtKind.Trait,
            name,
            methods,
        });
    }

    private let_decl(): Result<LetStmt> {
        if (!this.match(TokenKind.Let)) {
            return this.error(TokenKind.Let);
        }
        
        const mut = this.match(TokenKind.Mut);

        const name = this.consume(TokenKind.Ident);
        if (isError(name)) return name;

        const type = this.match(TokenKind.Colon)
            ? this.consume_type()
            : undefined;
        if (isError(type)) return type;
        if (!type) return {
            origin: ErrorOrigin.Parser,
            kind: ErrorKind.UnexpectedToken,
            message: "Expected type declaration",
            position: this.tokens[this.current].span.start,
        }

        const init = this.match(TokenKind.Equal)
            ? this.any_expr()
            : this.error(TokenKind.Equal);
        if (isError(init)) return init;

        if (!this.match(TokenKind.Semicolon)) {
            return this.error(TokenKind.Semicolon);
        }

        return this.node({
            kind: StmtKind.Let,
            mut,
            name,
            type,
            init,
        });
    }



    private any_stmt(): Result<Stmt> {
        let stmt: Result<Stmt> = this.while_stmt();
        if (!isError(stmt)) return stmt;
        stmt = this.for_stmt();
        if (!isError(stmt)) return stmt;
        stmt = this.break_stmt();
        if (!isError(stmt)) return stmt;
        stmt = this.continue_stmt();
        if (!isError(stmt)) return stmt;
        stmt = this.return_stmt();
        if (!isError(stmt)) return stmt;

        const expr_stmt = this.expr_stmt();
        if (!isError(expr_stmt)) return expr_stmt;

        return this.assign_stmt();
    }

    private while_stmt(): Result<WhileStmt> {
        if (!this.match(TokenKind.While)) {
            return this.error(TokenKind.While);
        }
        
        const condition = this.any_expr();
        if (isError(condition)) return condition;

        const block = this.block_expr();
        if (isError(block)) return block;

        return this.node({
            kind: StmtKind.While,
            condition,
            block,
        });
    }

    private for_stmt(): Result<ForStmt> {
        if (!this.match(TokenKind.For)) {
            return this.error(TokenKind.For);
        }
        
        const name = this.consume(TokenKind.Ident);
        if (isError(name)) return name;

        if (!this.match(TokenKind.In)) return this.error(TokenKind.In);

        const iter = this.any_expr();
        if (isError(iter)) return iter;

        const block = this.block_expr();
        if (isError(block)) return block;

        return this.node({
            kind: StmtKind.For,
            name,
            iter,
            block,
        });
    }
    
    private break_stmt(): Result<BreakStmt> {
        if (!this.match(TokenKind.Break)) {
            return this.error(TokenKind.Break);
        }
        
        if (!this.match(TokenKind.Semicolon)) {
            return this.error(TokenKind.Semicolon);
        }

        return this.node({
            kind: StmtKind.Break,
        });
    }

    private continue_stmt(): Result<ContinueStmt> {
        if (!this.match(TokenKind.Continue)) {
            return this.error(TokenKind.Continue);
        }
        
        if (!this.match(TokenKind.Semicolon)) {
            return this.error(TokenKind.Semicolon);
        }

        return this.node({
            kind: StmtKind.Continue,
        });
    }

    private return_stmt(): Result<ReturnStmt> {
        if (!this.match(TokenKind.Return)) {
            return this.error(TokenKind.Return);
        }
        
        const expr = this.match(TokenKind.Semicolon)
                ? undefined
                : this.any_expr();
        if (isError(expr)) return expr;

        if (!this.match(TokenKind.Semicolon)) {
            return this.error(TokenKind.Semicolon);
        }

        return this.node({
            kind: StmtKind.Return,
            expr,
        });
    }

    private assign_stmt(): Result<AssignStmt> {
        const expr = this.any_expr();
        if (isError(expr)) return expr;

        if (this.match([
            TokenKind.Equal,
            TokenKind.SlashEqual,
            TokenKind.PlusEqual,
            TokenKind.MinusEqual,
            TokenKind.AsteriskEqual,
            TokenKind.ModulusEqual,
            TokenKind.BitwiseAndEqual,
            TokenKind.BitwiseOrEqual,
            TokenKind.BitwiseXorEqual,
        ])) {
            const operator = this.tokens[this.current-1];
            const value = this.any_expr();
            if (isError(value)) return value;

            if (
                expr.kind === ExprKind.Ident ||
                expr.kind === ExprKind.GetField || 
                expr.kind === ExprKind.GetIndex 
            ) {
                return {
                    kind: StmtKind.Assign,
                    expr: expr,
                    operator,
                    value,
                    span: {
                        start: expr.span.start,
                        end: this.tokens[this.current-1].span.end,
                    },
                };
            } else {
                return {
                    origin: ErrorOrigin.Parser,
                    kind: ErrorKind.UnexpectedToken,
                    message: "Invalid assignment target",
                    position: this.tokens[this.current].span.start,
                };
            }
        }

        return {
            origin: ErrorOrigin.Parser,
            kind: ErrorKind.UnexpectedToken,
            message: "Expected assign statement",
            position: this.tokens[this.current].span.start,
        };
    }

    private expr_stmt(): Result<ExprStmt | ReturnStmt> {
        const expr = this.any_expr();
        if (isError(expr)) return expr;
        
        if (!this.match(TokenKind.Semicolon)) {
            return this.error(TokenKind.Semicolon);
        }

        return {
            kind: StmtKind.Expr,
            expr,
            span: {
                start: expr.span.start,
                end: this.tokens[this.current-1].span.end,
            },
        };
    }



    private function_type(): Result<FunctionType> {
        const name = this.consume(TokenKind.Ident);
        if (isError(name)) return name;

        if (!this.match(TokenKind.LeftParen)) {
            return this.error(TokenKind.LeftParen);
        }
        const params: FunctionType["params"] = [];
        while (!this.check(TokenKind.RightParen)) {
            if (
                !this.check(TokenKind.LeftParen, -1) &&
                !this.match(TokenKind.Comma)
            ) return this.error(TokenKind.Comma);
            
            const mut = this.match(TokenKind.Mut);

            const name = this.consume(TokenKind.Ident);
            if (isError(name)) return name;

            if (!this.match(TokenKind.Colon)) {
                return this.error(TokenKind.Colon);
            }

            const type = this.consume_type();
            if (isError(type)) return type;

            params.push({
                mut,
                name,
                type,
            });
        }

        if (!this.match(TokenKind.RightParen)) {
            return this.error(TokenKind.RightParen);
        }

        const return_type = this.match(TokenKind.Colon)
            ? this.consume_type()
            : null;

        if (isError(return_type)) return return_type;

        return {
            name,
            params,
            return_type,
            span: {
                start: name.span.start,
                end: this.tokens[this.current-1].span.end,
            },
        };
    }

    private consume_type(): Result<Type> {
        const t = this.tokens[this.current];
        if (this.match(TokenKind.Num)) return { kind: TypeKind.Number, value: <number><unknown>t.value * 1 }
        if (this.match(TokenKind.Str)) return { kind: TypeKind.String, value: <string>t.value }
        if (this.match(TokenKind.Bool)) return { kind: TypeKind.Boolean, value: <boolean>!!t.value }
        if (this.match(TokenKind.Any)) return { kind: TypeKind.Any, value: <string>t.value }
        if (this.match(TokenKind.Ident)) return { kind: TypeKind.Ident, value: <string>t.value }

        return {
            origin: ErrorOrigin.Parser,
            kind: ErrorKind.UnexpectedToken,
            message: "Expected a type",
            position: this.tokens[this.current].span.start,
        };
    }



    private any_expr(): Result<Expr> {
        const expr = this.operation_expr();
        if (isError(expr)) return expr;

        return expr;
    }

    private block_expr(): Result<BlockExpr> {
        if (!this.match(TokenKind.LeftBrace)) {
            return this.error(TokenKind.LeftBrace);
        }

        const stmts: BlockExpr["stmts"] = [];
        
        while (!this.check(TokenKind.RightBrace)) {
            const stmt = this.decl_stmt();
            if (isError(stmt)) {
                this.errors.push(stmt);
            } else {
                stmts.push(stmt);
            }
        }

        if (!this.match(TokenKind.RightBrace)) {
            return this.error(TokenKind.RightBrace);
        }
        
        return this.node({
            kind: ExprKind.Block,
            stmts,
        });
    }

    private if_expr(): Result<IfExpr> {
        if (!this.match(TokenKind.If)) {
            return this.error(TokenKind.If);
        }

        const condition = this.any_expr();
        if (isError(condition)) return condition;

        if (
            condition.kind !== ExprKind.Boolean &&
            condition.kind !== ExprKind.Ident &&
            condition.kind !== ExprKind.Call &&
            condition.kind !== ExprKind.Block &&
            condition.kind !== ExprKind.GetField &&
            condition.kind !== ExprKind.GetIndex &&
            condition.kind !== ExprKind.Unary &&
            condition.kind !== ExprKind.Binary &&
            condition.kind !== ExprKind.Group
        ) {
            return {
                origin: ErrorOrigin.Parser,
                kind: ErrorKind.UnexpectedToken,
                message: "Expected falsy expression",
                position: this.tokens[this.current].span.start,
            };
        }

        const then_stmt = this.block_expr();
        if (isError(then_stmt)) return then_stmt;

        const else_stmt = (this.match(TokenKind.Else) || undefined) // true or undefined
            && (this.match(TokenKind.If) // `else { ... }` or `else if (...) { ... }`
                ? this.if_expr()
                : this.block_expr()
            );
        if (isError(else_stmt)) return else_stmt;


        return this.node({
            kind: ExprKind.If,
            condition,
            then: then_stmt,
            else: else_stmt,
        });
    }

    private operation_expr(precedence = 0): Result<Expr> {
        if (precedence <= 9) { // Binary expression. `1+1` or `foo != bar`
            let expr = this.operation_expr(precedence+1);
            if (isError(expr)) return expr;

            const match = {
                0: TokenKind.LogicOr,
                1: TokenKind.LogicAnd,
                2: TokenKind.BitwiseXor,
                3: TokenKind.BitwiseOr,
                4: TokenKind.BitwiseAnd,
                5: [TokenKind.BangEqual, TokenKind.EqualEqual],
                6: [TokenKind.Greater, TokenKind.GreaterEqual, TokenKind.Less, TokenKind.LessEqual],
                7: [TokenKind.Plus, TokenKind.Minus],
                8: [TokenKind.Asterisk, TokenKind.Slash, TokenKind.Modulus],
                9: [TokenKind.DotDot, TokenKind.DotDotEqual],
            }[precedence] as TokenKind | TokenKind[];

            while (this.match(match)) {
                const operator = this.tokens[this.current-1];
                const right = this.operation_expr(precedence+1);
                if (isError(right)) return right;

                expr = this.node({
                    kind: ExprKind.Binary,
                    left: expr,
                    operator,
                    right,
                });
            }

            return expr;
        } else if (precedence === 10) { // Type cast. `variable as Type`
            return this.operation_expr(precedence+1); // @TODO Haven't thought about type casting yet

            // let expr = this.operation_expr(precedence+1);
            // if (isError(expr)) return expr;

            // while (this.match(TokenKind.As)) {
            //     const type = this.consume_type();
            //     if (isError(type)) return type;

            //     expr = {
            //         kind: ExprKind.TypeCast,
            //         expr: expr as Expr,
            //         type,
            //     };
            // }

            // return expr;
        } else if (precedence === 11) { // Unary expression. `!foo` or `-bar`
            if (this.match([TokenKind.Bang, TokenKind.Minus])) {
                const operator = this.tokens[this.current-1];
                const expr = this.operation_expr(precedence+1);
                if (isError(expr)) return expr;

                return this.node({
                    kind: ExprKind.Unary,
                    operator,
                    expr,
                });
            }

            return this.operation_expr(precedence+1);
        } else if (precedence === 12) { // Call expression. `func(arg)` or `obj.method(arg1, arg2)`
            const expr = this.operation_expr(precedence+1);
            
            if (this.match(TokenKind.LeftParen)) {
                const args: CallExpr["args"] = [];
                while (!this.match(TokenKind.RightParen)) {
                    if (
                        !this.check(TokenKind.LeftParen, -1) &&
                        !this.match(TokenKind.Comma)
                    ) {
                        return this.error(TokenKind.Comma);
                    }
            
                    const arg = this.operation_expr();
                    if (isError(arg)) return arg;
                    
                    args.push(arg);
                }

                if (isError(expr)) return expr;

                return this.node({
                    kind: ExprKind.Call,
                    func: expr,
                    args,
                });
            }

            return expr;
        } else if (precedence === 13) { // Index and field access. `array[3]` and `foo.bar`
            let expr = this.operation_expr(precedence+1);
            if (isError(expr)) return expr;

            if (this.check(TokenKind.LeftBracket)) {
                while (this.match(TokenKind.LeftBracket)) {
                    const index = this.operation_expr();
                    if (isError(index)) return index;

                    if (!this.match(TokenKind.RightBracket)) return this.error(TokenKind.RightBracket);
                    
                    expr = this.node({
                        kind: ExprKind.GetIndex,
                        expr,
                        index,
                    });
                }
                    
                return expr;
            }

            if (this.check(TokenKind.Dot)) {
                while (this.match(TokenKind.Dot)) {
                    const field = this.consume(TokenKind.Ident);
                    if (isError(field)) return field;
                    
                    expr = this.node({
                        kind: ExprKind.GetField,
                        expr,
                        field,
                    });
                }
                    
                return expr;
            }

            return expr;
        } else if (precedence === 14) { // Match expression. `match (...) { ... }`
            if (this.match(TokenKind.Match)) {
                const expr = this.operation_expr();
                if (isError(expr)) return expr;

                if (!this.match(TokenKind.LeftBrace)) {
                    return this.error(TokenKind.LeftBrace);
                }

                const arms: MatchArm[] = [];
                while (!this.match(TokenKind.RightBrace)) {
                    const e = this.operation_expr();
                    if (isError(e)) return e;
                    
                    if (!this.match(TokenKind.FatArrow)) {
                        return this.error(TokenKind.FatArrow);
                    }

                    const b = this.operation_expr();
                    if (isError(b)) return b;
                    
                    if (!this.match(TokenKind.Comma)) {
                        break;
                    }
                    
                    arms.push({
                        expr: e,
                        body: b,
                        span: {
                            start: e.span.start,
                            end: b.span.end,
                        }
                    });
                }

                // console.log(expr, arms);

                return this.node({
                    kind: ExprKind.Match,
                    expr,
                    arms,
                });
            }

            return this.operation_expr(precedence+1);
        } else if (precedence === 15) { // Grouping. `( ... )`
            if (this.match(TokenKind.LeftParen)) {
                const expr = this.operation_expr();
                
                if (!this.match(TokenKind.RightParen)) {
                    return this.error(TokenKind.RightParen);
                }
                
                return expr;
            }

            return this.operation_expr(precedence+1);
        } else if (precedence === 16) { // If Expression `if (...) { ... }`
            const expr = this.if_expr();
            if (isError(expr)) {
                return this.operation_expr(precedence+1);
            }

            return expr;
        } else if (precedence === 17) { // Block Expression `{ ... }`
            const expr = this.block_expr();
            if (isError(expr)) {
                return this.operation_expr(precedence+1);
            }

            return expr;
        } else if (precedence === 18) { // @TODO Macro call. Initial thought (macro!(ast) => template) or (macro!(tokens) => tokens)
            if (this.check(TokenKind.Ident)) {}

            return this.operation_expr(precedence+1);
        } else {
            return this.scalar_expr();
        }
    }

    private scalar_expr(): Result<Expr> {
        const t = this.tokens[this.current];
        if (this.match(TokenKind.False)) return this.node({ kind: ExprKind.Boolean, value: false });
        if (this.match(TokenKind.True)) return this.node({ kind: ExprKind.Boolean, value: true });
        if (this.match(TokenKind.Number)) return this.node({ kind: ExprKind.Number, value: <number><unknown>t.value });
        if (this.match(TokenKind.String)) return this.node({ kind: ExprKind.String, value: <string>t.value });
        if (this.match(TokenKind.Ident)) return this.node({ kind: ExprKind.Ident, ident: t });

        return {
            origin: ErrorOrigin.Parser,
            kind: ErrorKind.UnexpectedToken,
            message: "Expected scalar expression",
            position: this.tokens[this.current].span.start,
        };
    }



    private error(expected: TokenKind): Error {
        const t = this.tokens[this.current];
        return {
            origin: ErrorOrigin.Parser,
            kind: ErrorKind.UnexpectedToken,
            message: `Unexpected token ${t.value} expected ${expected} found ${t.value}`,
            position: this.tokens[this.current].span.start,
        };
    }

    private match(expected: TokenKind | TokenKind[]): boolean {
        if (!expected.includes(this.tokens[this.current]?.kind)) return false;

        this.current ++;

        return true;
    }

    private check(expected: TokenKind, offset = 0): boolean {
        const index = this.current+offset;
        if (index < 0 || index >= this.tokens.length) return false;
        if (this.tokens[index]?.kind === expected) return true;
        return false;
    }

    private consume(expected: TokenKind): Result<Token> {
        const t = this.tokens[this.current];
        if (t?.kind !== expected) {
            return this.error(expected);
        }

        this.current ++;

        return t;
    }

    private node<T>(node: T): { span: Span } & T { 
        const out = {
            ...node,
            span: {
                start: this.tokens[this.start].span.start,
                end: this.tokens[this.current-1].span.end,
            },
        };

        this.start = this.current;

        return out;
    }
}
