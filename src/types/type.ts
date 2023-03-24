export enum TypeKind {
    Boolean     = "Boolean",
    String      = "String",
    Number      = "Number",
    Object      = "Object",
    Array       = "Array",
    Identifier  = "Identifier",
    Any         = "Any",
}
export interface Boolean {
    kind: TypeKind.Boolean;
    value: boolean;
}
export interface String {
    kind: TypeKind.String;
    value: string;
}
export interface Number {
    kind: TypeKind.Number;
    value: number;
}
export interface Object {
    kind: TypeKind.Object;
    value: Record<string, unknown>;
}
export interface Array {
    kind: TypeKind.Array;
    value: unknown[];
}
export interface Identifier {
    kind: TypeKind.Identifier;
    value: string;
}
export interface Any {
    kind: TypeKind.Any;
    value: string;
}

export type Type =
    | Boolean
    | String
    | Number
    | Object
    | Array
    | Identifier
    | Any;