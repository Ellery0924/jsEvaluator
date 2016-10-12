js语句文法
Stmts->Stmt | Stmt ; Stmts | Block
Block->{ Stmts }
Stmt->Var | If | Switch | For | While | DoWhile | Function | Apply | TryCatchFinally | Debugger | Break | Continue | Return | Throw | New | e

//var
Var->var VarBody
VarBody->id VarBody' | id = Right VarBody'
Right->RVal | Function
VarBody'->e | , VarBody

ControlBlock->Stmt | Block

//if
If->if ( Expr ) ControlBlock
If'->e | else ControlBlock

//for
For->for ( ControlHandle ) ControlBlock
ControlHandle->Var in LVal | id in LVal | Initialize ; Expr ; Expr
Initialize->Var | Expr

//while
While->while ( Expr ) ControlBlock

//do-while
DoWhile->do ControlBlock while ( Expr )

//Function
Function->function FuncName ( ArgList ) Block | ( Function )
ArgList->e | id ArgList'
ArgList'-> e | ,id ArgList'
FuncName->e | id

//Apply
Apply->Function ( ApplyArgs ) | LVal ( ApplyArgs )
ApplyArgs->e | Expr0 ApplyArgs' | New ApplyArgs' | Apply ApplyArgs'
ApplyArgs'->e | , Expr0 ApplyArgs' | , New ApplyArgs' | , Apply ApplyArgs'

//try-catch
TryCatchFinally->try Block TryCatchFinally'
TryCatchFinally'->e | catch ( id ) Block Finally
Finally->e | finally Block

//debugger
Debugger->debugger

//Break
Break->break

//continue
Continue->continue

//return
Return->return Expr

//throw
Throw->throw Throw'
Throw'->New | Apply | Expr

//new
New->new Apply

