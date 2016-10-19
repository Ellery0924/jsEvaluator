function Klass(a, b) {
    this.a = a;
    this.b = b;
}
Klass.prototype = {
    c: function () {
        return d;
    }
};
var testObj = {
    klass: Klass,
    highOrderFunction: function (a) {
        return function (b) {
            return function (c) {
                return a + b + c;
            }
        }
    }
}
function fibonacci(n) {
    if (n === 1 || n === 2) {
        return 1;
    }
    else {
        return fibonacci(n - 1) + fibonacci(n - 2);
    }
}

var ins = new testObj.klass("a", "b");
var c = ins.c;
var h = testObj.highOrderFunction(1)(5)(100);
var fibRet = fibonacci(10);
var instOf = ins instanceof testObj.klass;

