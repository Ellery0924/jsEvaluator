js表达式文法!终于要开始做了!干巴呆!

js表达式优先级

最低优先级
1. = 赋值操作

三元运算符
2. ?: 三元条件表达式

二元运算符
3. || 或
4. && 与
5. === !== <= > < >= 比较运算(== != 已经被开除js籍)
6. +- 加减
7. */ 乘除

一元运算符
7. ++ -- += += -= *= /= !+ - 自加/自减/自乘/自除/not/数字求反 (~|&等等全部无视)
8. .

表达式文法
终结符: identifier(id) | string | number|  object | array | undefined | null | bool | e(空字符) | () |  以上所有运算符

//表达式文法入口
Expr->Expr0|Expr1|Expr2
//赋值运算符文法 左值=右值
Expr0->Lval=Rval
Rval->Expr
//左递归的左值文法
Lval->Lval.id | Lval[string] | Lval[number] | Lval[id] | id
//消除左递归的左值文法
Lval->idLval' | (Lval)
Lval'->.idLval' | [string]Lval' | [number]Lval' | [id]Lval'| [bool]Lval' | e
//三元操作符
Expr1->Expr2?Expr1:Expr1 | Expr2
//二元操作符
//+=,-=
Expr8-> Expr9 | Lval+=Expr9 | Lval-=Expr9
//*=,/=
Expr9->Lval*=Expr4 | Lval/=Expr4 | Expr4
//或操作符
Expr2->Expr3Expr2'
Expr2'->e | ||Expr3Expr2'
Expr->Expr3||Expr2 | Expr3
//与操作符
Expr3->Expr8Expr3'
Expr3'->e | &&Expr8Expr3'
//比较操作
Expr4->Expr5Expr4'
Expr4'->e | >Expr5Expr4' | >=Expr5Expr4' | <Expr5Expr4' | <=Expr5Expr4' | ===Expr5Expr4' | !==Expr5Expr4'
//加减法
Expr5->Expr6Expr5'
Expr5'->e | +Expr6Expr5' | -Expr6Expr5'
//乘除法
Expr6->FactorExpr6'
Expr6'-> *FactorExpr6' | /FactorExpr6'
//基本因子
Factor->Lval | string | number | object | array | undefined | null | bool | (Expr) | Expr7 | !Factor
Expr7->++Expr7'|--Expr7' | Expr7'--| Expr7'++
Expr7'->(Lval)|Lval
//对象
object->{objContent}
//对象内容
objContent->key:Expr,objContent | key:Expr | e
//键值
key->id | string | number
//数组
array->[arrayContent]
//数组内容
arrayContent->Expr,arrayContent | Expr | e