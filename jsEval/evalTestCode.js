var e = function (arg1, arg2, arg3) {
    return {
        b: function (a, b, c) {
        },
        e: {
            f: function fff() {
                return {
                    c: function ddd() {
                        return function ccccc(a) {
                            return {
                                g: function () {
                                    return a;
                                }
                            };
                        };
                    }
                };
            }
        }
    };
};
var a = [1, 2, [1, 2, { 3: 2 }]],
    d = 5;

var d = e(a, 2, this.d).e.f().c()(200).g();
var f = a[2][1]++;

