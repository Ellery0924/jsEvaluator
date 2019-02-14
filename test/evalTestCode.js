var value = 1;
function a() {
  console.log(value);
}

function b() {
  var value = 2;
  a();
}

b()
