js表达式文法!终于要开始做了!干巴呆!

js表达式优先级

最低优先级
1. = 赋值操作

三元运算符
2. ?: 三元条件表达式

二元运算符
3. || 或
4. && 与
5. === !== <= > < >= 比较运算(== != 已经被开除党籍)
6. +-/* 四则运算

一元运算符
7. ++ -- += += -= *= /= !+ - 自加/自减/自乘/自除/not/数字求反 (~|&等等全部无视)
8. .

表达式文法
终结符: identifier(id) | string | number|  object | array | undefined | null | bool | e(空字符,艾塔打不出来,凑合用e) 以上所有运算符
非终结符 Expr[n] n根据优先级从小到大递增 | Lval Lval' 左值文法 | Rval Rval' 右值文法 | Factor 基本类型/id

//赋值运算符文法 左值=更高优先级级表达式
Expr[0]->Lval=Rval

//左递归的左值文法
Lval->Lval.id|Lval[string]|Lval[number]|Lval[id]|id

//消除左递归的左值文法
Lval->idLval'
Lval'->.idLval'|[string]Lval'|[number]Lval'|[id]Lval'|e

//右值文法,无左递归
Rval->Factor|Expr[0-n]

//咖啡喝完了 回家!
Expr[1]->

Factor->id|string|number|object|array|undefined|null|bool
