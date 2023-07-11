// @TODO Update all error handling
export enum ErrorKind {
    UnexpectedToken = "UnexpectedToken",
    UpdateLater = "UpdateLater",
}
export enum ErrorOrigin {
    Parser = "Parser",
    Checker = "Checker",
}

export interface Error {
    origin: ErrorOrigin,
    kind: ErrorKind,
    message: string,
    position: number,
}
export function isError<T>(t: T | Error): t is Error {
    if (
        t &&
        typeof t === "object" &&
        "kind" in t &&
        "message" in t &&
        "origin" in t
    ) return true;
    return false;
}

export type Result<T> = T | Error;
