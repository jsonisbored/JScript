import {
    Token,
    TokenKind,
} from "./types/mod.ts";


export class Lexer {
    private readonly tokens: Token[] = [];
    private readonly errors: {
        current: number,
        message: string,
    }[] = [];
    private current = -1;
    private start = -1;
    private readonly chars: string[];


    private static readonly keywords: Record<string, TokenKind> = {
        "Any": TokenKind.Any,
        "while": TokenKind.While,
        "for": TokenKind.For,
        "in": TokenKind.In,
        "switch": TokenKind.Match,
        "if": TokenKind.If,
        "else": TokenKind.Else,
        "let": TokenKind.Let,
        "mut": TokenKind.Mut,
        "const": TokenKind.Const,
        "enum": TokenKind.Enum,
        "struct": TokenKind.Struct,
        "fn": TokenKind.Fn,
        "impl": TokenKind.Impl,
        "trait": TokenKind.Trait,
        "import": TokenKind.Import,
        "export": TokenKind.Export,
        "return": TokenKind.Return,
        "continue": TokenKind.Continue,
        "break": TokenKind.Break,
        "false": TokenKind.False,
        "true": TokenKind.True,
        "type": TokenKind.Type,
    };


    constructor(input: string) {
        this.chars = input.split("");
    }


    public tokenizer(): {
        tokens: Token[],
        errors: {
            current: number,
            message: string,
        }[],
    } {
        while (this.current < this.chars.length-1) { // Check for end of string
            const c = this.advance() as string; // Is safe
            this.start = this.current;
            console.log(c);
            

            if (c === ':') {
                if (this.match_char(':')) {
                    this.addToken(TokenKind.ColonColon, "::");
                } else {
                    this.addToken(TokenKind.Colon, ":");
                }
            } else if (c === ';') {
                this.addToken(TokenKind.Semicolon, ";");
            } else if (c === ',') {
                this.addToken(TokenKind.Comma, ",");
            } else if (c === '.') {
                if (this.match_char('.')) {
                    if (this.match_char('=')) {
                        this.addToken(TokenKind.DotDotEqual, "..=");
                    } else {
                        this.addToken(TokenKind.DotDot, "..");
                    }
                } else {
                    this.addToken(TokenKind.Dot, ".");
                }
            } else if (c === '(') {
                this.addToken(TokenKind.LeftParen, "(");
            } else if (c === ')') { 
                this.addToken(TokenKind.RightParen, ")");
            } else if (c === '{') {
                this.addToken(TokenKind.LeftCurlyBrace, "{");
            } else if (c === '}') {
                this.addToken(TokenKind.RightCurlyBrace, "}");
            } else if (c === '[') {
                this.addToken(TokenKind.LeftBracket, "[");
            } else if (c === ']') {
                this.addToken(TokenKind.RightBracket, "]");
            } else if (c === '-') {
                if (this.match_char('=')) {
                    this.addToken(TokenKind.MinusEqual, "-=");
                } else {
                    this.addToken(TokenKind.Minus, "-");
                }
            } else if (c === '+') {
                if (this.match_char('=')) {
                    this.addToken(TokenKind.PlusEqual, "+=");
                } else {
                    this.addToken(TokenKind.Plus, "+");
                }
            } else if (c === '/') {
                if (this.match_char('=')) {
                    this.addToken(TokenKind.SlashEqual, "/=");
                } else {
                    this.addToken(TokenKind.Slash, "/");
                }
            } else if (c === '*') {
                if (this.match_char('=')) {
                    this.addToken(TokenKind.AsteriskEqual, "*=");
                } else {
                    this.addToken(TokenKind.Asterisk, "*");
                }
            } else if (c === '>') {
                if (this.match_char('=')) {
                    this.addToken(TokenKind.GreaterEqual, ">=");
                } else {
                    this.addToken(TokenKind.Greater, ">");
                }
            } else if (c === '<') {
                if (this.match_char('=')) {
                    this.addToken(TokenKind.LessEqual, "<=");
                } else {
                    this.addToken(TokenKind.Less, "<");
                }
            } else if (c === '!') {
                if (this.match_char('=')) {
                    this.addToken(TokenKind.BangEqual, "!=");
                } else {
                    this.addToken(TokenKind.Bang, "!");
                }
            } else if (c === '=') {
                if (this.match_char('=')) {
                    this.addToken(TokenKind.EqualEqual, "==");
                } else {
                    this.addToken(TokenKind.Equal, "=");
                }
            } else if (c === '%') {
                if (this.match_char('=')) {
                    this.addToken(TokenKind.ModulusEqual, "%=");
                } else {
                    this.addToken(TokenKind.Modulus, "%");
                }
            } else if (c === '^') {
                if (this.match_char('=')) {
                    this.addToken(TokenKind.BitwiseXorEqual, "^=");
                } else {
                    this.addToken(TokenKind.BitwiseXor, "^");
                }
            } else if (c === '&') {
                if (this.match_char('=')) {
                    this.addToken(TokenKind.BitwiseAndEqual, "&=");
                }
                if (this.match_char('&')) {
                    this.addToken(TokenKind.LogicAnd, "&&");
                } else {
                    this.addToken(TokenKind.BitwiseAnd, "&");
                }
            } else if (c === '|') {
                if (this.match_char('=')) {
                    this.addToken(TokenKind.BitwiseOrEqual, "|=");
                }
                if (this.match_char('|')) {
                    this.addToken(TokenKind.LogicOr, "||");
                } else {
                    this.addToken(TokenKind.BitwiseOr, "|");
                }
            } else if (c === '"') {
                let str = "";
                while (this.chars[this.current+1] !== '"') {
                    const next = this.advance();
                    if (next) {
                        str += next;
                    } else {
                        this.errors.push({
                            current: this.current,
                            message: "Couldn't find end of string",
                        });
                        break;
                    }
                }
                this.advance();
                this.addToken(TokenKind.String, str);
            } else if (this.is_digit(c)) {
                let num = c;
                while (this.is_digit(this.chars[this.current+1])) {
                    num += this.advance();
                    if (this.chars[this.current] === "." && this.is_digit(this.chars[this.current+1])) {
                        num += this.advance();
                        num += this.advance();
                    } else {
                        this.errors.push({
                            current: this.current,
                            message: "Expected number after decimal point",
                        });
                    }
                }
                this.addToken(TokenKind.Number, num);
            } else if (this.is_alphabetic(c)) {
                let ident = c;
                while (this.is_alphanumeric(this.chars[this.current+1])) {
                    ident += this.advance();
                }
                const type = Lexer.keywords[ident] ?? TokenKind.Ident;
                this.addToken(type, ident);
            } else if (!" \n\r".split("").includes(c)) {
                this.errors.push();
            }
        }
        return {
            errors: this.errors,
            tokens: this.tokens,
        };
    }

    
    private advance(): string | undefined {
        this.current ++;
        return this.chars[this.current];
    }

    private addToken(kind: TokenKind, value: string): void {
        this.tokens.push({
            kind,
            span: {
                start: this.start,
                end: this.current+1,
            },
            value,
        });
    }

    private match_char(expected: string): boolean {
        if (this.chars[this.current+1] !== expected) {
            return false;
        }

        this.current ++;
        
        return true;
    }
    
    private is_digit(char: string): boolean {
        return char >= '0' && char <= '9';
    }

    private is_alphabetic(char: string): boolean {
        return (char.toUpperCase() != char.toLowerCase()) || char === "_";
    }

    private is_alphanumeric(char: string): boolean {
        return this.is_digit(char) || this.is_alphabetic(char);
    }
}
