var a = 1 ? false ? 2 : 4 : 5;
var b = 999999999;
var e, f, g = 1000, ddd = ({
    a: {
        "1": {
            c: 202
        }
    },
    2: function niubi(a, b, c) {
        return {
            foo: {
                b: {
                    sa: function sssss(d) {
                        var a = 10000, ddddddd = { v: 666 };
                        return {
                            sth: function t666(e) {
                                ddddddd.v++;
                                console.log(a, b, c, d, e);
                                return ddddddd;
                            }
                        }
                    }
                },
                eee: 666
            }
        };
    },
    3: {
        4: 5
    }
});

function fibonacci(n) {
    if (n === 1 || n === 2) {
        return 1;
    }
    else {
        return fibonacci(n - 1) + fibonacci(n - 2);
    }
}

function factorial(n) {
    if (n === 1) {
        return 1;
    }
    else {
        return n * factorial(n - 1);
    }
}

var fibRet = fibonacci(10);
console.log('fibRet:', fibRet);
var closureTest1 = ddd[2](1, 100, 6)['foo'].b['sa'](7).sth;
var closureTest2 = ddd[2](1, 100, 6)['foo'].b['sa'](7).sth;
var ret1, ret2;
ret1 = closureTest1(5);
ret1 = closureTest1(1000000);

ret2 = closureTest2(100);
ret2 = closureTest2(10000000000000);
ret2 = closureTest2();
ret2 = closureTest2();
ret2 = closureTest2();
var facRet = factorial(20);
console.log(ret1, ret2, facRet);