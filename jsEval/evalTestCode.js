var a = 1 ? false ? 2 : 4 : 5;
var e, f, g = 1000, ddd = ({
    a: {
        "1": {
            c: 202
        }
    },
    2: function (a, b, c) {
        return {
            foo: {
                sa: function (d) {
                    var a = 10000;
                    return function uu() {
                        var d = 66;
                        return function ccc() {
                            return a + b + c + d;
                        }
                    }
                }
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

var fibRet = fibonacci(10);
var dddRet = ddd[2](1, 100, 6)['foo'].sa(7)()();