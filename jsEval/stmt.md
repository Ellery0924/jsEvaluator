js语句文法

Stmts->Stmt | Stmt ; Stmts | Block
Block->{ Stmts }
Stmt->Var | If | Switch | For | While | DoWhile | Function | Call | TryCatchFinally | Debugger | Break | Continue | Return | Throw | New | e

//var
Var->var VarBody
VarBody->id VarBody' | id = Right VarBody'
Right->ThreeItemOperator
VarBody'->e | , VarBody

ControlBlock->Block | Stmt

//if
If->if ( Expr ) ControlBlock If'
If'->e | else ControlBlock

//for
For->for ( ControlHandle ) ControlBlock
ControlHandle->Var in Expr | id in Expr | Initialize ; Expr ; Expr
Initialize->Var | Expr

//while
While->while ( Expr ) ControlBlock

//do-while
DoWhile->do ControlBlock while ( Expr )

//try-catch
TryCatchFinally->try Block TryCatchFinally'
TryCatchFinally'->e | catch ( id ) Block Finally
Finally->e | finally Block

//Break
Break->break

//continue
Continue->continue

//return
Return->return Expr

//throw
Throw->throw Expr

表达式

Expr->Comma

//逗号
Comma->Assign Comma'
Comma'->e | , Assign Comma'

//赋值运算符
Assign->LVal AssignOperator RVal | ThreeItemOpr | Or
//LVal 左值
LVal->id LVal'
LVal'->. id LVal' | [Expr] LVal' | e
RVal->Assign
AssignOperator->= | *= | /= | += | -= | %=

//?:
ThreeItemOpr->Or ? ThreeItemOpr : ThreeItemOpr

//Or
Or->And Or'
Or'-> e | || And Or'

And->InstanceOfOrIn And'
And'-> e | && InstanceOfOrIn And'

InstanceOfOrIn->Compare InstanceOfOrIn'
InstanceOfOrIn'-> e | in Compare InstanceOfOrIn' | instanceof Compare InstanceOfOrIn'

Compare->PlusOrMinus Compare'
Compare'->e | CompareOperator PlusOrMinus Compare'
CompareOperator-> === | !== | >= | <= | != | == | > | <

PlusOrMinus-> MultiOrDiv PlusOrMinus'
PlusOrMinus'-> e | + MultiOrDiv PlusOrMinus' | - MultiOrDiv PlusOrMinus'

MultiOrDiv->Factor MultiOrDiv'
MultiOrDiv'-> e | * Factor MultiOrDiv' | / Factor MultiOrDiv'

EXPR_CALL->FACTOR ( CALL_ARGS )

Factor->BasicType | Object | Array | (Expr) | - Factor | + Factor | ~ Factor
        | ! Factor | Typeof | Delete | Void | Function | Access | Call | New
        | SelfPlusOrMinus | SelfPlusOrMinusBackward | e

SelfPlusOrMinus->++ LVal | -- LVal
SelfPlusOrMinusBackward-> LVal ++ | LVal --

BasicType->bool | string | number | null | undefined

//new
New->new Call | new Access

//Function
Function->function FuncName ( ArgList ) Block | ( Function )
ArgList->e | id ArgList'
ArgList'-> e | , id ArgList'
FuncName->e | id

//Access
Access->( Expr ) . Access | (Expr) [Expr] . ( CallArgs ) | LVal ( CallArgs ) . Access | LVal | ( Expr ) [Expr]
CallArgs->( Expr RestArgs )
RestArgs->e | , Expr RestArgs

//对象
Object->{ObjContent}
//对象内容
ObjContent->key:Comma,ObjContent | Key:Comma | e
//键值
Key->id | string | number
//数组
Array->[Comma]

Typeof->typeof Factor
Delete->delete LVal
Void->void Factor

