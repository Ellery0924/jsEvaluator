var closureCreator = function () {
  var n = 0;
  return function add1() {
    n++;
    return n;
  };
};

var add = closureCreator();
var result = add();
