function wrapper() {
    var id = { value: -1 };
    return {
        closureA: function () {
            ++id.value;
            console.log('id added by a ', id);
            return id;
        },
        closureB: function () {
            ++id.value;
            console.log('id added by b ', id);
            return id;
        }
    };
}

var ret = wrapper();

console.log('=== Closure ===');
var obj1 = ret.closureA();
var obj2 = ret.closureB();
var obj3 = ret.closureA();
var obj4 = ret.closureB();
console.log(obj1 === obj2, obj2 === obj3, obj3 === obj4);

console.log('=== Recursive, Callstack ===');
function fib(n) {
    if (n === 0 || n === 1) {
        return 1;
    } else {
        return fib(n - 1) + fib(n - 2);
    }
}

function factorial(n) {
    if (n === 1) {
        return 1;
    } else {
        return n * factorial(n - 1);
    }
}
console.log('fib 10:', fib(10));
console.log('fact 5:', factorial(5));

console.log('=== Prototype chain ====');
function Animal() {
}

Animal.prototype = {
    sayMyName: function () {
        console.log('My name is', this.name);
    }
};

function Cat(name) {
    this.name = name;
}

Cat.prototype = new Animal();
Cat.prototype.meow = function () {
    console.log('Meow!');
    this.sayMyName();
};

var jerry = new Cat('Jerry');
jerry.meow();
console.log('Is Jerry a cat? ', jerry instanceof Cat);
console.log('Is Jerry an animal? ', jerry instanceof Animal);

console.log('=== sort ===');
function swap(arr, i, j) {
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
}

function partition(arr, start, end) {
    var p = arr[end];
    var i = start, j = start;
    while (j < end) {
        var current = arr[j];
        if (current < p) {
            swap(arr, i, j);
            i++;
        }
        j++;
    }
    swap(arr, i, end);
    return i;
}

function _quicksort(arr, start, end) {
    if (start >= end) {
        return [];
    }

    var p = partition(arr, start, end);
    _quicksort(arr, start, p - 1);
    _quicksort(arr, p + 1, end);
}

function quicksort(arr) {
    _quicksort(arr, 0, arr.length - 1);
}

function insertionsort(arr) {
    for (var i = 1; i < arr.length; i++) {
        var cur = arr[i];
        var j = i;
        while (cur < arr[j - 1] && j > 0) {
            arr[j] = arr[j - 1];
            j--;
        }
        arr[j] = cur;
    }
}

function bubblesort(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
        for (var j = 0; j < i; j++) {
            if (arr[j] > arr[i]) {
                swap(arr, i, j);
            }
        }
    }
}

var arr1 = [5, 2, 7, 8, 6, 3, 10000, 200];
bubblesort(arr1);
console.log('result of bubblesort: ', arr1);

var arr2 = [2100, 2000, 3, 6, 7, 1, 131, 232];
quicksort(arr2);
console.log('result of quicksort: ', arr2);

var arr3 = [2, 2121, 222, 55, 33, 21];
insertionsort(arr3);
console.log('result of insertionsort: ', arr3);