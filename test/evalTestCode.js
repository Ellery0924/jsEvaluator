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

var arr = [9, 40, 33, 22, 1];
quickSort(arr, 0, arr.length - 1);
console.log(arr);