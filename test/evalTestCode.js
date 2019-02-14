var value = 1;

function b() {
  value++;
  console.log(value);
}

for (var i = 0; i < 3; i++) {
  b();
}

