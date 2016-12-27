/**
 * JS代码求值器(严格模式)
 * 根据生成的抽象语法树运行js代码
 */
'use strict';
//全局作用域
const global = {
    isGlobal: true,
    // 将原生的console注入
    console: {
        type: 'variable',
        value: console
    },
    Math: {
        type: 'variable',
        value: Math
    }
};
// 函数调用栈
const callStack = [];
// 循环堆栈
const loopStack = [];
// 匿名函数id
let guid = -1;
// 循环id
let loopid = -1;
// 闭包id
let closureId = -1;

function error(node) {
    throw new Error('syntax error:' + JSON.stringify(node));
}

function hoistFunctionDeclaration(node, env) {
    if (node.token === 'BLOCK') {
        const children = node.children;
        const target = children[1];

        if (target.token === 'STMTS') {
            hoistFunctionDeclaration(target, env);
        } else if (target.token !== '}') {
            extractFunctionDeclarationFromStmt(target, env);
        }
    } else if (node.token === 'STMTS') {
        const stmt = node.children[0];
        const restStmts = findNodeInChildrenBy(node, 'STMTS');

        extractFunctionDeclarationFromStmt(stmt, env);
        if (restStmts) {
            hoistFunctionDeclaration(restStmts, env);
        } else {
            const restStmt = node.children.find(child => child !== stmt && child.token !== ';');
            if (restStmt) {
                hoistFunctionDeclaration(restStmt, env);
            }
        }
    } else {
        extractFunctionDeclarationFromStmt(node, env);
    }
}

function flattenFuncArgs(args) {
    return args.reduce((acc, arg) => {
        if (arg.type === 'id') {
            acc = acc.concat(arg);
        } else {
            acc = acc.concat(arg.children.filter(child => child.type === 'id'));
        }
        return acc;
    }, []).map(arg => arg.token).reverse();
}

function funcTag(node, funcId) {
    node.funcId = funcId;
    if (node.children) {
        node.children.forEach(child => funcTag(child, funcId));
    }
}

function extractFunctionDeclarationFromStmt(node, env) {
    const children = node.children;

    if (node.token === 'FUNCTION') {
        const funcName = children[1].type === 'id' ? children[1].token : null;
        const funcBodyNode = findNodeInChildrenBy(node, 'BLOCK');
        const argsNode = children.slice(
            children.findIndex(child => child.token === '(') + 1,
            children.findIndex(child => child.token === ')')
        )[0];

        function getArgs(node, ret) {
            if (!node) {
                return ret;
            }
            if (node.type === 'id') {
                ret.push(node.token);
            } else {
                const id = node.children[0].token;
                ret.push(id);
                getArgs(node.children[2], ret);
            }
            return ret;
        }

        let args = getArgs(argsNode, []);

        const funcId = funcName ? funcName : '___function___' + ++guid;
        const scope = { ___parent___: env };

        env[funcId] = {
            type: 'function',
            value: {
                body: funcBodyNode,
                args: args,
                scope: scope,
                funcId: funcId,
                type: 'function',
                name: funcName || null,
                length: args.length,
                prototype: Object.prototype
            }
        };

        funcTag(node, funcId);
        hoistFunctionDeclaration(funcBodyNode, scope);
    } else if (children) {
        children.forEach(child => hoistFunctionDeclaration(child, env));
    }
}

function findNodeInChildrenBy(node, cond, by) {
    return node && node.children ? node.children.find(child =>
            child[by !== 'type' ? 'token' : 'type'] === cond
        ) : null;
}

function hoistVariable(node, env) {
    const children = node.children;
    if (node.token === 'STMTS') {
        const stmt = children[0];
        const nextStmts = findNodeInChildrenBy(node, 'STMTS');

        hoistVariableInStmt(stmt, env);

        if (nextStmts) {
            hoistVariable(nextStmts, env);
        } else {
            const rest = children.find(child => child !== stmt && child.token !== ';');
            if (rest) {
                hoistVariableInStmt(rest, env);
            }
        }
    } else if (node.token === 'BLOCK') {
        const stmts = findNodeInChildrenBy(node, 'STMTS');
        if (stmts) {
            hoistVariable(stmts, env);
        } else if (children[1].token !== '}') {
            hoistVariableInStmt(children[1], env);
        }
    } else {
        hoistVariableInStmt(node, env);
    }
}

function hoistVariableInStmt(node, env) {
    const children = node.children;

    if (node.token === 'VAR' || node.token === 'VAR_BODY_REST') {
        const varBody = findNodeInChildrenBy(node, 'VAR_BODY');
        let idNode = findNodeInChildrenBy(varBody, 'id', 'type');

        if (!idNode) {
            idNode = findNodeInChildrenBy(node, 'id', 'type');
        }

        env[idNode.token] = { type: 'variable' };

        const varBodyRest = findNodeInChildrenBy(varBody, 'VAR_BODY_REST');

        if (varBodyRest) {
            hoistVariableInStmt(varBodyRest, env);
        }
        children.forEach(child => {
            if (child !== varBodyRest && child !== idNode && child.token !== '=') {
                hoistVariableInStmt(child, env);
            }
        });
    } else if (node.token === 'FUNCTION') {
        const funcBody = findNodeInChildrenBy(node, 'BLOCK');
        const funcId = node.funcId;

        if (env[funcId].type === 'function') {
            const scope = env[funcId].value.scope;
            hoistVariable(funcBody, scope);
        }
    } else if (children) {
        children.forEach(child => {
            hoistVariable(child, env);
        });
    }
}

function clearEnv(env) {
    for (var key in env) {
        if (env.hasOwnProperty(key)) {
            const item = env[key];

            if (item.type === 'function') {
                delete item.value.scope.___parent___;
                delete item.value.body;
                delete item.value.THIS;
                clearEnv(item.value.scope);
            }

            if (item.type === 'closure') {
                delete env[key];
            }
        }
    }
}

function stmts(node, env) {
    const children = node.children;
    const stmt = children[0];
    const rest = findNodeInChildrenBy(node, 'STMTS');

    evaluate(stmt, env);
    // return后面的语句都可以跳过, 如果stms是一个正在调用的函数体, 那么需要检测该函数是否已经return
    // break同理
    const currentCall = callStack[callStack.length - 1];
    const currentLoop = loopStack[loopStack.length - 1];
    if ((currentCall && !currentCall.hasReturned || !currentCall)
        && ( currentLoop && !currentLoop._break || !currentLoop)) {
        if (rest) {
            stmts(rest, env);
        } else {
            const lastStmt = children.find(child => child !== stmt && child.token !== ';');
            evaluate(lastStmt, env);
        }
    }
}

function _var(node, env) {
    const varBody = findNodeInChildrenBy(node, 'VAR_BODY');
    //没有varBody是没有赋值的var语句
    if (varBody) {
        return _varBody(varBody, env);
    }
}

function _varBody(node, env) {
    const children = node.children;
    const idNode = children[0];
    const rest = findNodeInChildrenBy(node, 'VAR_BODY_REST');
    const valueNode = children.find(child =>
        child !== idNode
        && child.token !== ','
        && child.token !== '='
        && child !== rest
    );
    const id = idNode.token;
    const value = valueNode ? evaluate(valueNode, env) : undefined;

    env[id] = {
        type: 'variable',
        value: value
    };

    if (rest) {
        const nextBody = findNodeInChildrenBy(rest, 'VAR_BODY');
        if (nextBody) {
            _varBody(nextBody, env);
        }
    }
}

function findRef(id, env, context) {
    if (context) {
        return context[id];
    } else {
        return lookupId(id, env);
    }
}

function lookupId(id, env) {
    // 尝试获取当前调用函数的闭包
    const topCall = callStack[callStack.length - 1];
    const closureId = topCall ? topCall.callee.___closure___ : null;
    // closureId是从0开始的,坑爹啊!
    const closure = closureId != null ? global['closure_' + closureId] : null;
    // 合并实参到当前环境
    if (callStack.length) {
        env = Object.assign({}, closure, topCall.appliedArgs, env);
    }

    if (id === 'this') {
        return { value: callStack[callStack.length - 1].context };
    }

    if (env[id]) {
        return env[id];
    } else if (env.___parent___) {
        return lookupId(id, env.___parent___);
    } else {
        throw new Error('Referrence error: ' + id + ' is not defined.');
    }
}

function _object(node, env) {
    const content = findNodeInChildrenBy(node, 'OBJECT_CONTENT');

    if (content) {
        return objContent(content, env, {});
    } else {
        return {};
    }
}

function objContent(node, env, ret) {
    const children = node.children;
    const keyNode = children[0];
    const value = children[2];

    ret[keyNode.token] = evaluate(value, env);

    const rest = findNodeInChildrenBy(node, 'OBJECT_CONTENT');

    if (rest) {
        return objContent(rest, env, ret);
    } else {
        return ret;
    }
}

function array(node, env) {
    const content = node.children.find(child => child.token !== ']' && child.token !== '[');
    if (content) {
        if (content.token === 'COMMA') {
            return arrContent(content, env, []);
        } else {
            return [evaluate(content, env)];
        }
    } else {
        return [];
    }
}

function arrContent(node, env, ret) {
    const car = node.children[node.token === 'COMMA' ? 0 : 1];
    ret.push(evaluate(car, env));
    const rest = findNodeInChildrenBy(node, 'COMMA_REST');
    if (rest) {
        return arrContent(rest, env, ret);
    } else {
        return ret;
    }
}

function factor(node, env) {
    const children = node.children;
    const car = children[0].token;
    const rest = children[1];
    switch (car) {
        case '!':
            return !evaluate(rest, env);
        case '-':
            return -evaluate(rest, env);
        case '+':
            return +evaluate(rest, env);
        case '~':
            return ~evaluate(rest, env);
        case '(':
            return evaluate(rest, env);
        case 'typeof':
            var rightValue = evaluate(rest, env);
            if (typeof rightValue === 'object' && rightValue.type === 'function') {
                return 'function';
            }
            return typeof evaluate(rest, env);
        case 'void':
            evaluate(rest, env);
            return;
        case '++':
        case '--':
            return selfPlusOrMinus(rest, env, car);
        case 'delete':
            const ref = accessRef(rest, env);
            const context = ref.context;
            const lastRef = ref.lastRef;
            return delete context[lastRef];
    }
}

function selfPlusOrMinus(node, env, operator, isBackward) {
    const currentRef = accessRef(node, env);
    const context = currentRef.context;
    const lastRef = currentRef.lastRef;
    const currentVal = context[lastRef];

    if (!isBackward) {
        if (operator === '++') {
            context[lastRef] = currentVal + 1;
            return context[lastRef];
        } else {
            context[lastRef] = currentVal - 1;
            return context[lastRef];
        }
    } else {
        if (operator === '++') {
            context[lastRef] = currentVal + 1;
            return currentVal;
        } else {
            context[lastRef] = currentVal - 1;
            return currentVal;
        }
    }
}

function twoItemOperation(node, env) {
    const children = node.children;
    let ret = evaluate(children[0], env);
    let next = children.find(child => child.token.match(/_REST/));
    let operator = next.children[0].token;
    let operatee = evaluate(next.children[1], env);

    while (operator && operatee != null) {
        switch (operator) {
            case '*':
                ret = ret * operatee;
                break;
            case '/':
                ret = ret / operatee;
                break;
            case '%':
                ret = ret % operatee;
                break;
            case '+':
                ret = ret + operatee;
                break;
            case '-':
                ret = ret - operatee;
                break;
            case '>':
                ret = ret > operatee;
                break;
            case '<':
                ret = ret < operatee;
                break;
            case '>=':
                ret = ret >= operatee;
                break;
            case '<=':
                ret = ret <= operatee;
                break;
            case '===':
                ret = ret === operatee;
                break;
            case '!==':
                ret = ret !== operatee;
                break;
            case '==':
                ret = ret == operatee;
                break;
            case '!=':
                ret = ret != operatee;
                break;
            case '&&':
                ret = ret && operatee;
                break;
            case '||':
                ret = ret || operatee;
                break;
            case 'instanceof':
                let instResult = false;
                while (ret) {
                    if (ret.___proto___ === operatee.prototype) {
                        instResult = true;
                        break;
                    }
                    ret = ret.___proto___;
                }
                return instResult;
            case 'in':
                let inResult = false;
                while (operatee) {
                    if (operatee.hasOwnProperty(ret)) {
                        inResult = true;
                        break;
                    }
                    operatee = operatee.___proto___;
                }
                return inResult;
        }

        next = next.children.find(child => child.token.match(/_REST/));
        if (next) {
            operator = next.children[0].token;
            operatee = evaluate(next.children[1], env);
        } else {
            break;
        }
    }

    return ret;
}

function threeItemOperation(node, env) {
    const children = node.children;
    const condNode = children[0];
    const thenNode = children[2];
    const elseNode = children[4];

    if (evaluate(condNode, env)) {
        return evaluate(thenNode, env);
    } else {
        return evaluate(elseNode, env);
    }
}

function lVal(node, env) {
    const children = node.children;
    const first = children[0];
    const rest = findNodeInChildrenBy(node, 'LVAL_REST');
    const context = lookupId(first.token, env).value;

    return lValRest(rest, env, context);
}

function lValRest(node, env, context) {
    const children = node.children;
    const isDirectlyAccess = children[0].token === '.';
    const idNode = children[1];
    const rest = findNodeInChildrenBy(node, 'LVAL_REST');

    let id;
    if (idNode.type !== 'id') {
        id = evaluate(idNode, env);
    } else {
        id = isDirectlyAccess ? idNode.token : evaluate(idNode, env);
    }

    if (rest) {
        return lValRest(rest, env, lookupAttrOnProtoChain(id, context));
    } else {
        return { context: context, lastRef: id, value: lookupAttrOnProtoChain(id, context) };
    }
}

// 沿着原型链向上查找
function lookupAttrOnProtoChain(attrName, target) {
    if (target[attrName] != null) {
        return target[attrName];
    } else if (target.___proto___) {
        return lookupAttrOnProtoChain(attrName, target.___proto___);
    } else {
        return undefined;
    }
}

function accessRef(node, env) {
    if (node.token === 'LVAL') {
        return lVal(node, env);
    } else {
        const context = lookupId(node.token, env);
        const lastRef = 'value';
        const value = context != null ? context[lastRef] : context;
        return { context: context, lastRef: lastRef, value: value };
    }
}

function accessValue(node, env) {
    if (node.token === 'LVAL') {
        return lVal(node, env).value;
    } else if (node.type === 'id') {
        return lookupId(node.token, env).value;
    } else if (node.token === 'FUNCTION') {
        return lookupId(node.funcId, env).value;
    }
}

function assign(node, env) {
    const children = node.children;
    const leftNode = children[0];
    const rightNode = children[2];
    const operator = children[1].token;
    const leftRef = accessRef(leftNode, env);
    const context = leftRef.context;
    const lastRef = leftRef.lastRef;
    const rightValue = evaluate(rightNode, env);

    switch (operator) {
        case '=':
            context[lastRef] = rightValue;
            return rightValue;
        case '+=':
            context[lastRef] = context[lastRef] + rightValue;
            return rightValue;
        case '-=':
            context[lastRef] = context[lastRef] - rightValue;
            return rightValue;
        case '*=':
            context[lastRef] = context[lastRef] * rightValue;
            return rightValue;
        case '/=':
            context[lastRef] = context[lastRef] / rightValue;
            return rightValue;
        case '%=':
            context[lastRef] = context[lastRef] % rightValue;
            return rightValue;
    }
}

function comma(node, env) {
    const children = node.children;
    const exprNode = children.find(child => child.token !== ',' && child.token !== 'COMMA_REST');
    const rest = findNodeInChildrenBy(node, 'COMMA_REST');
    const exprVal = evaluate(exprNode, env);

    if (rest) {
        return comma(rest, env);
    } else {
        return exprVal;
    }
}

function block(node, env) {
    const stmts = node.children[1];
    evaluate(stmts, env);
}

function _if(node, env) {
    const children = node.children;
    const conditionNode = children[2];
    const thenBlock = findNodeInChildrenBy(node, 'BLOCK');
    const elseNode = findNodeInChildrenBy(node, 'IF_REST');
    const elseBlock = findNodeInChildrenBy(elseNode, 'BLOCK');
    const condRet = evaluate(conditionNode, env);

    if (condRet) {
        evaluate(thenBlock, env);
    } else {
        evaluate(elseBlock, env);
    }
}

function accessFromContext(node, env, context) {
    if (node.type === 'id') {
        return { value: context[node.token], context: context };
    } else if (node.token === 'LVAL') {
        const children = node.children;
        const first = children[0];
        const nextContext = context[first.token];
        const rest = findNodeInChildrenBy(node, 'LVAL_REST');
        return lValRest(rest, env, context[first.token]);
    }
}

function _return(node, env) {
    const children = node.children;
    const val = children[1];
    callStack[callStack.length - 1].RETURN = evaluate(val, env);
    callStack[callStack.length - 1].hasReturned = true;
}

function callArgs(node, env, ret) {
    const children = node.children;
    const first = children[0];
    const rest = children[2];

    ret.push(evaluate(first, env));

    if (rest.token !== 'CALL_ARGS') {
        ret.push(evaluate(rest, env));
        return ret;
    } else {
        return callArgs(rest, env, ret);
    }
}

function accessArgs(node, env) {
    const children = node.children;
    const evalArgs = children[1];
    if (evalArgs.token === 'CALL_ARGS') {
        return callArgs(evalArgs, env, []);
    } else {
        return [evaluate(evalArgs, env)];
    }
}

function _new(node, env) {
    const children = node.children;
    const calleeNode = children[1];
    return accessCall(calleeNode, env, null, true);
}

function accessCall(node, env, context, isNew) {
    const children = node.children;
    let currentContext = context || null;
    let applyContext = null;

    for (let i = 0; i < children.length; i++) {
        let currentNode = children[i];
        if (currentNode.token === 'LVAL') {
            if (!currentContext) {
                const ref = accessRef(currentNode, env);
                currentContext = ref.value;
                applyContext = ref.context;
            } else {
                const ref = accessFromContext(currentNode, env, currentContext);
                currentContext = ref.value;
                applyContext = ref.context;
            }
        } else if (currentNode.type === 'id') {
            if (!currentContext) {
                const ref = accessRef(currentNode, env);
                currentContext = ref.value;
                applyContext = global;
            } else {
                const ref = accessFromContext(currentNode, env, currentContext);
                currentContext = ref.value;
                applyContext = ref.context;
            }
        } else if (currentNode.token === '.') {
            let next = children[i + 1];
            if (next.token !== 'ACCESS_CALL') {
                if (!currentContext) {
                    const ref = accessRef(next, env);
                    currentContext = ref.value;
                    applyContext = ref.context;
                } else {
                    const ref = accessFromContext(next, env, currentContext);
                    currentContext = ref.value;
                    applyContext = ref.context;
                }
                i++;
            }
        } else if (currentNode.token === '[') {
            let expr = children[i + 1];
            currentContext = currentContext[evaluate(expr, env)];
            i = i + 2;
        } else if (currentNode.token === 'ACCESS_CAL_ARGS') {
            const argsNode = currentNode;
            const callee = currentContext;

            if (typeof callee === 'function') {
                let actualArgs = accessArgs(argsNode, env);
                return callee.apply(applyContext, actualArgs);
            } else {
                const actualArgs = accessArgs(argsNode, env);
                let appliedArgs;

                appliedArgs = actualArgs.reduce((ret, arg, i) => {
                    ret[callee.args[i]] = { type: 'variable', value: arg };
                    return ret;
                }, {});

                callStack.push({
                    // 如果是new调用的, 那么context是一个链接到prototype上的空对象
                    context: !isNew ? applyContext || global : { ___proto___: callee.prototype },
                    callee: callee,
                    appliedArgs: appliedArgs
                });

                // 克隆作用域,并连接到外层作用域上
                const scope = cloneScope(callee.scope);
                evaluate(callee.body, scope);
                const lastCall = callStack.pop();
                currentContext = lastCall.RETURN;
                // new的返回值是return的值或者this
                if (!currentContext && isNew) {
                    currentContext = lastCall.context;
                }
                // 如果返回值是对象或者函数, 尝试创建闭包
                if (lastCall.RETURN &&
                    (lastCall.RETURN.type === 'function'
                    || typeof lastCall.RETURN === 'object')) {
                    makeClosure(lastCall, lastCall.RETURN, callee, scope);
                }
            }
        } else if (currentNode.token === 'ACCESS_CALL') {
            currentContext = accessCall(currentNode, env, currentContext, isNew);
        }
    }

    return currentContext;
}

function cloneScope(scope) {
    const ret = {};
    for (var vname in scope) {
        if (scope.hasOwnProperty(vname)) {
            if (vname === '___parent___') {
                ret[vname] = scope[vname];
            } else {
                const variable = scope[vname];
                const value = variable.value;
                const type = value ? value.type : null;
                if (type === 'function') {
                    const fret = {};
                    for (var fattr in value) {
                        if (value.hasOwnProperty(fattr)) {
                            if (fattr !== 'scope') {
                                fret[fattr] = JSON.parse(JSON.stringify(value[fattr]));
                            } else {
                                fret[fattr] = cloneScope(value[fattr]);
                            }
                        }
                    }
                    ret[vname] = { type: 'function', value: fret };
                } else {
                    ret[vname] = JSON.parse(JSON.stringify(variable));
                }
            }
        }
    }
    return ret;
}

function makeClosure(call, ret, callee, scope) {
    closureId++;
    let scopeCopy = scope;
    const appliedArgs = call.appliedArgs;
    if (appliedArgs) {
        Object.keys(appliedArgs).forEach(key => {
            const val = appliedArgs[key];
            if (scopeCopy[key] == null || scopeCopy[key].value == null) {
                scopeCopy[key] = val;
            }
        });
    }
    // 合并外层函数的闭包
    const parentClosure = global['closure_' + callee.___closure___];
    let closure = Object.assign({}, parentClosure, {
        madeBy: callee.name,
        type: 'closure',
        closureId: closureId
    });
    // 最内层的变量应该取当前环境的, 其余的父级作用域应该取外层函数的闭包的
    let lvl = 0;
    while (scopeCopy) {
        Object.keys(scopeCopy).forEach(key => {
            const variable = scopeCopy[key];
            const value = variable.value;
            if (value &&
                (closure[key] == null || closure[key].value == null)
                || (lvl === 0 && key !== '___parent___')) {
                closure[key] = variable;
            }
        });
        lvl++;
        scopeCopy = scopeCopy.___parent___;
    }

    global['closure_' + closureId] = closure;

    // 递归查找返回值是否是函数,或者是对象的一个属性是函数,如果是,绑定刚创建的闭包的id
    function bindClosure(target) {
        if (target && target.type === 'function') {
            target.___closure___ = closureId;
        } else if (target) {
            Object.keys(target).forEach(key => {
                const val = target[key];
                bindClosure(val);
            });
        }
    }

    bindClosure(ret);
}

function _for(node, env) {
    const children = node.children;
    const controlHandleNode = findNodeInChildrenBy(node, 'CONTROL_HANDLE');
    const initialNode = controlHandleNode.children[0];
    const condNode = controlHandleNode.children[2];
    const afterLoopNode = controlHandleNode.children[4];
    const block = findNodeInChildrenBy(node, 'BLOCK');
    loopStack.push({
        id: ++loopid,
        _break: false
    });

    evaluate(initialNode, env);
    _loopBody(condNode, afterLoopNode, block, env, loopid);
    loopStack.pop();
}

function _loopBody(condNode, afterLoopNode, block, env, loopid) {
    const cond = evaluate(condNode, env);
    const currentLoop = loopStack[loopStack.length - 1];

    if (currentLoop
        && currentLoop.id === loopid
        && !currentLoop._break) {
        if (cond) {
            evaluate(block, env);
            evaluate(afterLoopNode, env);
            _loopBody(condNode, afterLoopNode, block, env, loopid);
        }
    }
}

function _break() {
    const currentLoop = loopStack[loopStack.length - 1];
    currentLoop._break = true;
}

function _while(node, env) {
    const children = node.children;
    const condNode = children[2];
    const blockNode = children[4];

    loopStack.push({
        id: ++loopid,
        _break: false
    });
    _whileBody(condNode, blockNode, env, loopid);
    loopStack.pop();
}

function _do(node, env) {
    const children = node.children;
    const blockNode = children[1];
    const condNode = children[4];

    loopStack.push({
        id: ++loopid,
        _break: false
    });
    evaluate(blockNode, env);
    _whileBody(condNode, blockNode, env, loopid);
    loopStack.pop();
}

function _whileBody(condNode, blockNode, env, loopid) {
    const cond = evaluate(condNode, env);
    const currentLoop = loopStack[loopStack.length - 1];

    if (currentLoop
        && currentLoop.id === loopid
        && !currentLoop._break) {

        if (cond) {
            evaluate(blockNode, env);
            _whileBody(condNode, blockNode, env, loopid);
        }
    }
}

function evaluate(node, env) {
    if (node) {
        const token = node.token;
        if (node.type === 'NON_TERM') {
            switch (token) {
                case 'BLOCK':
                    return block(node, env);
                case 'STMTS':
                    return stmts(node, env);
                case 'VAR':
                    return _var(node, env);
                case 'OBJECT':
                    return _object(node, env);
                case 'ARRAY':
                    return array(node, env);
                case 'FACTOR':
                    return factor(node, env);
                case 'MULTI_OR_DIV':
                case 'PLUS_OR_MINUS':
                case 'COMPARE':
                case 'INSTANCE_OF_OR_IN':
                case 'AND':
                case 'OR':
                case 'INSTANCE_OF_OR_IN':
                    return twoItemOperation(node, env);
                case 'THREE_ITEM_OPERATION':
                    return threeItemOperation(node, env);
                case 'LVAL':
                    return accessValue(node, env);
                case 'SELF_PLUS_OR_MINUS_BACKWARD':
                    const operator = node.children[1].token;
                    const operatee = node.children[0];
                    return selfPlusOrMinus(operatee, env, operator, true);
                case 'ASSIGN':
                    return assign(node, env);
                case 'FUNCTION':
                    return accessValue(node, env);
                case 'COMMA':
                    return comma(node, env);
                case 'IF':
                    return _if(node, env);
                case 'ACCESS_CALL':
                    return accessCall(node, env);
                    break;
                case 'RETURN':
                    return _return(node, env);
                case 'BREAK':
                    return _break();
                case 'NEW':
                    return _new(node, env);
                case 'FOR':
                    return _for(node, env);
                case 'WHILE':
                    return _while(node, env);
                case 'DO':
                    return _do(node, env);
            }
        } else {
            const type = node.type;
            switch (type) {
                case 'number':
                    return Number(token);
                case 'string':
                    return String(token);
                case 'bool':
                    return token === 'true' ? true : false;
                case 'null':
                    return null;
                case 'undefined':
                    return undefined;
                case 'id':
                    return accessValue(node, env);
            }
        }
    }
}

//js求值器,根据抽象语法树运行js代码
module.exports = (ptree) => {
    //提升函数声明
    hoistFunctionDeclaration(ptree.root, global);
    //提升变量声明
    hoistVariable(ptree.root, global);
    //求值
    evaluate(ptree.root, global);
    //清理循环引用以输出JSON
    clearEnv(global);

    return {
        parseTree: ptree,
        env: global
    };
};