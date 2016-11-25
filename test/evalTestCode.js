function bubbleSort(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
        for (var j = 0; j < i; j++) {
            if (arr[j] > arr[j + 1]) {
                var temp = arr[j + 1];
                arr[j + 1] = arr[j];
                arr[j] = temp;
            }
        }
    }
}

function quickSort(arr) {
    if (!arr.length) {
        return [];
    }

    var left = [];
    var right = [];
    var p = arr[0];

    for (var i = 1; i < arr.length; i++) {
        var ele = arr[i];
        if (ele < p) {
            left.push(ele);
        } else {
            right.push(ele);
        }
    }

    var leftJoin = quickSort(left).concat(p);
    var ret = leftJoin.concat(quickSort(right));
    return ret;
}

var a = [5, 4, 3, 2, 1, 6, 7, 8, 9];
var b = quickSort(a);
bubbleSort(a);
console.log('bubblesort', a);
console.log('quicksort', b);
