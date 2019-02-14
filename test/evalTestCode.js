var value = 1;

function b() {
  var a = '123123';
  value++;
  console.log(value, a);
}

for (var i = 0; i < 3; i++) {
  b();
}

