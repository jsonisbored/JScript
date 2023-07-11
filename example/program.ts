function fib(n: number): number {
    if (n < 2) {
        return n;
    };
    return fib(n - 1) + fib(n - 2);
}
function fib2(n: number): number {
    switch (n) {
        case 0:
        case 1: 
            return 1;

        default: 
            return fib2(n - 1) + fib2(n - 2);

    };
}
console.log(fib(10));
