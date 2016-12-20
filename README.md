# jsEval

## 简介

使用javascript实现的javascript解释器，基本支持了所有的js语法。
模拟实现了js的作用域链、闭包、原型链，以及函数调用栈等等。
可以调用部分数组和对象方法，也可以调用console的方法。

## API
```
const eval = require('jsEvaluator');
const code = 'var a = 1; a++; console.log(a);';
eval(code);

// 输出 {env: // 全局环境快照, parseTree: // 语法分析树}
```

## 运行test
测试用的js代码位于./test/evalTestCode.js，运行后会输出全局作用域和语法分析树到test
下面的env.json和evalret.json文件中。

```
cd test
node index
```