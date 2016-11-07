function a() {
    var privateAttr = {
        num: -1,
        obj: {
            num2: 1000
        }
    };

    return {
        foo: function () {
            ++privateAttr.num;
            --privateAttr.obj.num2;
            return this;
        },
        log: function () {
            console.log(privateAttr);
            return this;
        }
    }
}

var inst = a();
inst.foo().foo().foo().log();

var inst2 = a();
inst2.foo().log();