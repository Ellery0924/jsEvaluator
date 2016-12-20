for (var i = 0; i < 10; i++) {
    console.log('i', i);
    for (var j = 0; j < 5; j++) {
        console.log('j', j);
        if (j >= 3) {
            console.log('j break at', j);
            break;
            console.log('impossible');
        }
    }

    if (i > 7) {
        console.log('i break at', i);
        break;
    }
}

function bubbleSort(array) {
    for (var i = array.length - 1; i > 0; i--) {
        for (var j = 0; j < i; j++) {
            var tmp = array[j + 1];
            if (array[j] > array[j + 1]) {
                array[j + 1] = array[j];
                array[j] = tmp;
            }
        }
    }
}

function factorial(n) {
    if (n === 1) {
        return 1;
    } else {
        return n * factorial(n - 1);
    }
}

function fibonacci(n) {
    if (n === 1 || n === 2) {
        return 1;
    } else {
        return fibonacci(n - 1) + fibonacci(n - 2);
    }
}

function Parent() {
}

Parent.prototype = {
    foo: function () {
        console.log('i am from klass!');
    }
};

function Child() {
}

Child.prototype = new Parent();
Child.prototype.bar = function () {
    console.log('i am from child!')
};

function closure() {
    var clsVar = { value: 0 };

    return {
        plus: function () {
            clsVar.value++;
            console.log('plus', clsVar);
            return this;
        },
        minus: function () {
            clsVar.value--;
            console.log('minus', clsVar);
            return this;
        }
    };
}

function hof(foo) {
    var another = { value: 1000 };
    return function (a, b) {
        return foo(a.value, b.value) + another.value;
    };
}

var arr = [5, 4, 3, 2, 1];
bubbleSort(arr);
console.log(arr);
console.log(factorial(5));
console.log(fibonacci(10));

var child = new Child();
child.foo();
child.bar();
console.log(child instanceof Child);

var cls1 = closure();
var cls2 = closure();
console.log('cls1');
cls1.minus().plus().minus();
console.log('cls2');
cls2.plus().plus().minus();

var hoftest = hof(function (a, b) {
    return a * b;
});

var ret = hoftest({ value: 200 }, { value: 10 });
console.log(ret);

var testOb = {
    foo: function () {
        return 1000;
    }
}

console.log(typeof 'nani');