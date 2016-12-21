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

var arr = [100, 5, 4, 3, 2, 3];
console.log(countingSort(arr, 100));
quickSort(arr, 0, arr.length - 1);
console.log(arr);