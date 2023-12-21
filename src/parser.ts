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
    ObjectExpr,

    AST,
} from "./types/mod.ts";


export class Parser {
    private readonly tokens: Token[];
    private readonly errors: Error[] = [];
    private current = 0;

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
            // console.dir(stmts, { depth: 10 });
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
        stmt = this.struct_decl();
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
        const start = this.current;
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

        return {
            name,
            kind: StmtKind.Const,
            type,
            init,
            span: {
                start,
                end: this.current,
            },
        };
    }

    private fn_decl(): Result<FnStmt> {
        const start = this.current;
        if (!this.match(TokenKind.Fn)) {
            return this.error(TokenKind.Fn);
        }
        
        const type = this.fn_type();
        if (isError(type)) return type;

        const block = this.block_expr();
        if (isError(block)) return block;

        return {
            kind: StmtKind.Fn,
            type,
            block,
            span: {
                start,
                end: this.current,
            },
        };
    }

    private enum_decl(): Result<EnumStmt> {
        const start = this.current;
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

        return {
            kind: StmtKind.Enum,
            name,
            fields,
            span: {
                start,
                end: this.current,
            },
        };
    }

    private struct_decl(): Result<StructStmt> {
        const start = this.current;
        if (!this.match(TokenKind.Struct)) {
            return this.error(TokenKind.Struct);
        }
        
        const name = this.consume(TokenKind.Ident);
        if (isError(name)) return name;

        // if (!this.match(TokenKind.Equal)) {
        //     return this.error(TokenKind.Equal);
        // }

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

            fields.push({ name, type });

            if (!this.match(TokenKind.Comma)) {
                break;
            }
        }

        return {
            kind: StmtKind.Struct,
            name,
            fields,
            span: {
                start,
                end: this.current,
            },
        };
    }

    private impl_decl(): Result<ImplStmt> {
        const start = this.current;
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

            if (this.match(TokenKind.RightBrace)) {
                break;
            }
        }

        return {
            kind: StmtKind.Impl,
            impl_name,
            for_name,
            methods,
            span: {
                start,
                end: this.current,
            },
        };
    }

    private trait_decl(): Result<TraitStmt> {
        const start = this.current;
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
            if (!this.match(TokenKind.Fn)) {
                return this.error(TokenKind.Fn);
            }
            
            const type = this.fn_type();
            if (isError(type)) return type;
            
            const b = this.block_expr();
            const block = isError(b) ? undefined : b;

            if (!block) this.match(TokenKind.Semicolon);

            methods.push({ type, block });
        }

        return {
            kind: StmtKind.Trait,
            name,
            methods,
            span: {
                start,
                end: this.current,
            },
        };
    }

    private let_decl(): Result<LetStmt> {
        const start = this.current;
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

        return {
            kind: StmtKind.Let,
            mut,
            name,
            type,
            init,
            span: {
                start,
                end: this.current,
            },
        };
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

        return this.assign_or_expr_stmt();
    }

    private while_stmt(): Result<WhileStmt> {
        const start = this.current;
        if (!this.match(TokenKind.While)) {
            return this.error(TokenKind.While);
        }
        
        const condition = this.any_expr();
        if (isError(condition)) return condition;

        const block = this.block_expr();
        if (isError(block)) return block;

        return {
            kind: StmtKind.While,
            condition,
            block,
            span: {
                start,
                end: this.current,
            },
        };
    }

    private for_stmt(): Result<ForStmt> {
        const start = this.current;
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

        return {
            kind: StmtKind.For,
            name,
            iter,
            block,
            span: {
                start,
                end: this.current,
            },
        };
    }
    
    private break_stmt(): Result<BreakStmt> {
        const start = this.current;
        if (!this.match(TokenKind.Break)) {
            return this.error(TokenKind.Break);
        }
        
        if (!this.match(TokenKind.Semicolon)) {
            return this.error(TokenKind.Semicolon);
        }

        return {
            kind: StmtKind.Break,
            span: {
                start,
                end: this.current,
            },
        };
    }

    private continue_stmt(): Result<ContinueStmt> {
        const start = this.current;
        if (!this.match(TokenKind.Continue)) {
            return this.error(TokenKind.Continue);
        }
        
        if (!this.match(TokenKind.Semicolon)) {
            return this.error(TokenKind.Semicolon);
        }

        return {
            kind: StmtKind.Continue,
            span: {
                start,
                end: this.current,
            },
        };
    }

    private return_stmt(): Result<ReturnStmt> {
        const start = this.current;
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

        return {
            kind: StmtKind.Return,
            expr,
            span: {
                start,
                end: this.current,
            },
        };
    }

    private assign_or_expr_stmt(): Result<AssignStmt | ExprStmt | ReturnStmt> {
        const expr = this.any_expr();
        if (isError(expr)) return expr;

        if (this.check(TokenKind.Equal)) {
            return this.assign_stmt(expr);
        }

        if (this.match(TokenKind.Semicolon)) {
            return {
                kind: StmtKind.Expr,
                expr,
                span: {
                    start: expr.span.start,
                    end: this.tokens[this.current-1].span.end,
                },
            };
        } else {
            return {
                kind: StmtKind.Return,
                expr,
                span: {
                    start: expr.span.start,
                    end: this.tokens[this.current-1].span.end,
                },
            };
        }
        // if (!this.match(TokenKind.Semicolon)) {
        //     return this.error(TokenKind.Semicolon);
        // }

    }

    private assign_stmt(expr: Expr): Result<AssignStmt> {
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

            if (!this.match(TokenKind.Semicolon)) {
                return this.error(TokenKind.Semicolon);
            }

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



    private fn_type(): Result<FunctionType> {
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
        // @TODO: What was I thinking?
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
        return this.operation_expr();
    }

    private blocky_expr(): Result<BlockExpr | ObjectExpr> {
        const current = this.current;

        const object = this.object_expr();
        if (!isError(object)) return object;

        this.current = current;

        const block = this.block_expr();
        if (!isError(block)) return block;

        return this.error(TokenKind.LeftBrace);
    }

    private block_expr(): Result<BlockExpr> {
        const start = this.current;
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
        
        return {
            kind: ExprKind.Block,
            stmts,
            span: {
                start,
                end: this.current,
            },
        };
    }

    private object_expr(): Result<ObjectExpr> {
        const start = this.current;
        if (!this.match(TokenKind.LeftBrace)) {
            return this.error(TokenKind.LeftBrace);
        }

        const props: ObjectExpr["props"] = [];
        
        while (!this.check(TokenKind.RightBrace)) {
            const key = this.consume(TokenKind.Ident);
            if (isError(key)) return key;

            if (!this.match(TokenKind.Colon)) {
                return this.error(TokenKind.Colon);
            }

            const value = this.operation_expr();
            if (isError(value)) return value;

            props.push({ key, value });

            if (!this.match(TokenKind.Comma)) {
                break;
            }
        }

        if (!this.match(TokenKind.RightBrace)) {
            return this.error(TokenKind.RightBrace);
        }

        return {
            kind: ExprKind.Object,
            props,
            span: {
                start,
                end: this.current,
            },
        };
    }

    private if_expr(): Result<IfExpr> {
        const start = this.current;
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


        return {
            kind: ExprKind.If,
            condition,
            then: then_stmt,
            else: else_stmt,
            span: {
                start,
                end: this.current,
            },
        };
    }

    private operation_expr(precedence = 0): Result<Expr> {
        const start = this.current;
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

                expr = {
                    kind: ExprKind.Binary,
                    left: expr,
                    operator,
                    right,
                    span: {
                        start,
                        end: this.current,
                    },
                };
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

                return {
                    kind: ExprKind.Unary,
                    operator,
                    expr,
                    span: {
                        start,
                        end: this.current,
                    },
                };
            }

            return this.operation_expr(precedence+1);
        } else if (precedence === 12 || precedence === 14) { // Call expression. `func(arg)` or `obj.method(arg1, arg2)`
            const expr = this.operation_expr(precedence+1);
            
            if (this.match(TokenKind.LeftParen)) {
                const args: CallExpr["args"] = [];
                while (!this.check(TokenKind.RightParen)) {
                    const arg = this.any_expr();
                    if (isError(arg)) return arg;
                    
                    args.push(arg);

                    if (!this.match(TokenKind.Comma)) {
                        break;
                    }
                }

                if (!this.match(TokenKind.RightParen)) {
                    return this.error(TokenKind.RightParen);
                }

                if (isError(expr)) return expr;

                return {
                    kind: ExprKind.Call,
                    func: expr,
                    args,
                    span: {
                        start,
                        end: this.current,
                    },
                };
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
                    
                    expr = {
                        kind: ExprKind.GetIndex,
                        expr,
                        index,
                        span: {
                            start,
                            end: this.current,
                        },
                    };
                }
                
                return expr;
            }

            if (this.check(TokenKind.Dot)) {
                while (this.match(TokenKind.Dot)) {
                    const field = this.consume(TokenKind.Ident);
                    if (isError(field)) return field;
                    
                    expr = {
                        kind: ExprKind.GetField,
                        expr,
                        field,
                        span: {
                            start,
                            end: this.current,
                        },
                    };
                }
                
                return expr;
            }

            return expr;
        } else if (precedence === 15) { // Grouping. `( ... )`
            if (this.match(TokenKind.LeftParen)) {
                const expr = this.operation_expr();
                
                if (!this.match(TokenKind.RightParen)) {
                    return this.error(TokenKind.RightParen);
                }
                
                return expr;
            }

            return this.operation_expr(precedence+1);
        } else if (precedence === 16) { // Match expression. `match (...) { ... }`
            if (this.match(TokenKind.Match)) {
                const expr = this.operation_expr();
                if (isError(expr)) return expr;

                if (!this.match(TokenKind.LeftBrace)) {
                    return this.error(TokenKind.LeftBrace);
                }

                const arms: MatchArm[] = [];
                while (!this.check(TokenKind.RightBrace)) {
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

                if (!this.match(TokenKind.RightBrace)) {
                    return this.error(TokenKind.RightBrace);
                }

                return {
                    kind: ExprKind.Match,
                    expr,
                    arms,
                    span: {
                        start,
                        end: this.current,
                    },
                };
            }

            return this.operation_expr(precedence+1);
        } else if (precedence === 17) { // If Expression `if (...) { ... }`
            const expr = this.if_expr();
            if (isError(expr)) {
                return this.operation_expr(precedence+1);
            }

            return expr;
        } else if (precedence === 18) { // Block and Object expressions `{ ... }`
            const expr = this.blocky_expr();
            if (isError(expr)) {
                return this.operation_expr(precedence+1);
            }

            return expr;
        } else if (precedence === 19) { // @TODO Macro call. Initial thought (macro!(ast) => template) or (macro!(tokens) => tokens)
            if (this.check(TokenKind.Ident)) {}

            return this.operation_expr(precedence+1);
        } else if (precedence === 20) { // Path. `Animal::new`
            let expr = this.operation_expr(precedence+1);

            if (expr.kind !== ExprKind.Ident && expr.kind !== ExprKind.Path) {
                return expr;
            }

            while (this.match(TokenKind.ColonColon)) {
                const e = this.any_expr();
                if (isError(e)) return e;
                
                expr = {
                    kind: ExprKind.Path,
                    left: expr,
                    right: e,
                    span: {
                        start,
                        end: this.current,
                    },
                };
            }

            return expr;
        } else {
            return this.scalar_expr();
        }
    }

    private scalar_expr(): Result<Expr> {
        const start = this.current;
        const t = this.tokens[this.current];
        if (this.match(TokenKind.False)) {
            return {
                kind: ExprKind.Boolean,
                value: false,
                span: {
                    start,
                    end: this.current,
                },
            };
        } else if (this.match(TokenKind.True)) {
            return {
                kind: ExprKind.Boolean,
                value: true,
                span: {
                    start,
                    end: this.current,
                },
            };
        } else if (this.match(TokenKind.Number)) {
            return {
                kind: ExprKind.Number,
                value: <number><unknown>t.value,
                span: {
                    start,
                    end: this.current,
                },
            };
        } else if (this.match(TokenKind.String)) {
            return {
                kind: ExprKind.String,
                value: <string>t.value,
                span: {
                    start,
                    end: this.current,
                },
            };
        } else if (this.match(TokenKind.Ident)) {
            return {
                kind: ExprKind.Ident,
                ident: t,
                span: {
                    start,
                    end: this.current,
                },
            };
        }

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
}
