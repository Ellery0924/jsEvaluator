js语句文法
Program->Block | Stmts
Block->{Stmts}
Stmts->Stmt | Stmt;Stmts | Block
Stmt->Var | If | Switch | For | While | DoWhile | Function | Apply | TryCatchFinally | Debugger | Break | Continue | Return | Throw
Var->var id=ExprVar'
Var'->e | ,id=ExprVar'