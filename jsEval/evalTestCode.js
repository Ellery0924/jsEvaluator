function fib(n) {
    if (n === 1 || n === 2) {
        return 1;
    }
    else {
        return fib(n - 1) + fib(n - 2);
    }
}

function factorial(n) {
    if (n === 1) {
        return 0;
    }
    return n * factorial(n - 1);
}

var fibRet = fib(10);
var facRet = factorial(5);