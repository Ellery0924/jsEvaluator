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

console.log('=== Quicksort and Countingsort ===');

function quickSort(arr, start, end) {
    if (start >= end) {
        return;
    }
    var q = partition(arr, start, end);
    quickSort(arr, start, q - 1);
    quickSort(arr, q + 1, end);
}

function swap(arr, i, j) {
    var tmp = arr[j];
    arr[j] = arr[i];
    arr[i] = tmp;
}

function partition(arr, start, end) {
    var r = arr[end], j, i;
    j = start;
    for (i = start; i < end; i++) {
        if (arr[i] < r) {
            swap(arr, i, j);
            j++;
        }
    }
    swap(arr, end, j);
    return j;
}

function count(arr, largest) {
    var counts = [];
    for (var i = 0; i <= largest; i++) {
        counts[i] = 0;
    }
    for (var j = 0; j < arr.length; j++) {
        counts[arr[j]]++;
    }
    for (var k = 1; k < counts.length; k++) {
        counts[k] += counts[k - 1];
    }
    return counts;
}

function countingSort(arr, largest) {
    var counts = count(arr, largest),
        ret = [];
    for (var i = 0; i < arr.length; i++) {
        var ele = arr[i];
        ret[counts[ele] - 1] = ele;
        counts[ele]--;
    }
    return ret;
}

var arr = [5, 2, 7, 8, 1000, -1];
quickSort(arr, 0, 5);
console.log(arr);

arr = [6, 5, 2, 9, 1000, 2];
console.log(countingSort(arr, 1000));