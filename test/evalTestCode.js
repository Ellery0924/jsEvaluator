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

var a = [5, 4, 3, 2, 1];
bubbleSort(a);
console.log(a);
