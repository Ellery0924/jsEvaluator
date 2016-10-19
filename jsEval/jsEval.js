/**
 * JS代码求值器(严格模式)
 * 根据生成的抽象语法树运行js代码
 */
'use strict';
const UNDEF = 'UNDEF';
let guid = -1;

function error(node) {
    throw new Error('syntax error:' + JSON.stringify(node));
}

function hoistFunctionDeclaration(node, env) {
    if (node.token === 'BLOCK') {
        const children = node.children;
        const target = children[1];
        if (target.token === 'STMTS') {
            hoistFunctionDeclaration(target, env);
        }
        else if (target.token !== '}') {
            extractFunctionDeclarationFromStmt(target, env);
        }
    }
    else if (node.token === 'STMTS') {
        const stmt = node.children[0];
        const restStmts = node.children[1].token === ';' ? node.children[2] : node.children[1];
        extractFunctionDeclarationFromStmt(stmt, env);
        if (restStmts) {
            hoistFunctionDeclaration(restStmts, env);
        }
    }
    else {
        extractFunctionDeclarationFromStmt(node, env);
    }
}

function flattenFuncArgs(args) {
    return args.reduce((acc, arg)=> {
        if (arg.type === 'id') {
            acc = acc.concat(arg);
        }
        else {
            acc = acc.concat(arg.children.filter(child=>child.type === 'id'));
        }
        return acc;
    }, []).map(arg => arg.token).reverse();
}

function extractFunctionDeclarationFromStmt(stmt, env, oneOff) {
    if (stmt.isProposed) {
        return;
    }
    const stmtChildren = stmt.children;
    if (stmtChildren) {
        const funcTokenIndex = stmtChildren.findIndex(child=>child.token === 'function');

        if (funcTokenIndex === 0) {
            let funcName = stmtChildren[1];
            let argsIndex = 3;

            if (funcName.type !== 'id') {
                argsIndex = 2;
                funcName = null;
            }

            const funcArgs = flattenFuncArgs(stmtChildren.slice(argsIndex, stmtChildren.findIndex(child=>child.token === ')')));
            const funcBody = stmtChildren.find(child=>child.token === 'BLOCK');
            const funcScope = {};

            funcArgs.forEach(arg=> {
                funcScope[arg] = {
                    type: 'variable',
                    value: {}
                }
            });

            const identifier = !oneOff ? funcName.token : String('function_' + ++guid);

            env[identifier] = {
                type: 'function',
                name: funcName ? funcName.token : null,
                body: funcBody,
                args: funcArgs,
                length: funcArgs.length,
                scope: funcScope,
                prototype: {},
                callId: 0
            };
            env[identifier].scope.__1024__ = env;
            stmt.identifier = identifier;
            stmt.isProposed = true;
            hoistFunctionDeclaration(funcBody, funcScope);
        }
        stmtChildren.forEach((child, i)=> {
            if (i !== funcTokenIndex) {
                extractFunctionDeclarationFromStmt(child, env, true);
            }
        });
    }
}

function hoistVariables(node, env) {
    if (node.token === 'BLOCK') {
        const stmts = node.children[1];
        if (stmts.token === 'STMTS') {
            hoistVariables(stmts, env);
        }
        else if (stmts.token !== '}') {
            hoistVariablesInStmt(stmts, env);
        }
    }
    else if (node.token === 'STMTS') {
        const stmt = node.children[0];
        hoistVariablesInStmt(stmt, env);
        if (node.children[1] && node.children[1].token === 'STMTS') {
            hoistVariables(node.children[1], env);
        }
        else if (node.children[2] && node.children[2].token === 'STMTS') {
            hoistVariables(node.children[2], env);
        }
    }
    else {
        hoistVariablesInStmt(node, env);
    }

    for (var key in env) {
        if (env.hasOwnProperty(key)) {
            const val = env[key];
            if (val.type === 'function') {
                hoistVariables(val.body, val.scope);
            }
        }
    }
}

function hoistVariablesInStmt(node, env) {
    if (node.token === 'VAR' || node.token === 'VAR_BODY_REST') {
        const varBody = node.children[1];
        let varBodyRest, varName;
        if (varBody.type !== 'id') {
            varBodyRest = varBody.children.find(child=>child.token === 'VAR_BODY_REST');
            varName = varBody.children[0];
        }
        else {
            varBodyRest = null;
            varName = varBody;
        }
        env[varName.token] = {
            type: 'variable'
        };
        if (varBodyRest && varBodyRest.children[1]) {
            hoistVariablesInStmt(varBodyRest, env);
        }
    }
}

function clearEnv(env) {
    for (var key in env) {
        if (env.hasOwnProperty(key)) {
            const item = env[key];
            if (item.type === 'function') {
                delete item.scope.__1024__;
                delete item.body;
                delete item.THIS;
                clearEnv(item.scope);
            }
        }
    }
}

function evaluate(node, env, _this, func, isNew) {
    const token = node.token;
    const type = node.type;
    if (type === 'NON_TERM') {
        switch (token) {
            case 'STMTS':
                stmts(node, env, _this, func);
                break;
            case 'OBJECT':
                return object(node, env, _this, func);
            case 'ARRAY':
                return array(node, env, _this, func);
            case 'VAR':
                return _var(node, env, _this, func);
            case 'FACTOR':
                return factor(node, env, _this, func);
            case 'FUNCTION':
                return lookupVariable(node.identifier, env, _this, func).value;
            case 'LVAL':
                return lVal(node, env, null, _this, func).value;
            case 'ACCESS_CALL':
                return accessCall(node, env, global, _this, isNew, func);
            case 'BLOCK':
                block(node, env, _this, func);
                break;
            case 'RETURN':
                _return(node, env, _this, func);
                break;
            case 'SELF_PLUS_OR_MINUS_BACKWARD':
                const car = node.children[0];
                const cadr = node.children[1];
                return selfPlusOrMinus(car, env, _this, cadr.token === '++', true, func);
            case 'MULTI_OR_DIV':
            case 'PLUS_OR_MINUS':
            case 'COMPARE':
            case 'INSTANCE_OF_OR_IN':
            case 'AND':
            case 'OR':
                return twoItemOperation(node, env, _this, func);
            case 'THREE_ITEM_OPERATION':
                return threeItemOperation(node, env, _this, func);
            case 'ASSIGN':
                return assign(node, env, _this, func);
            case 'COMMA':
                return comma(node, env, _this, func);
            case 'NEW':
                return _new(node, env, _this, func);
            case 'IF':
                return _if(node, env, _this, func);
        }
    }
    else {
        switch (type) {
            case 'number':
                return Number(token);
            case 'string':
                return token;
            case 'bool':
                return !!token;
            case 'null':
                return null;
            case 'undefined':
                return undefined;
            case 'id':
                return lookupVariable(token, env, _this, func).value;
        }
    }
}

function _if(node, env, _this, func) {
    const children = node.children;
    const conditionNode = children[2];
    const thenNode = children[4];
    const elseNode = children.find(child=>child.token === 'IF_REST');

    if (evaluate(conditionNode, env, _this, func)) {
        evaluate(thenNode, env, _this, func);
    }
    else if (elseNode) {
        if (elseNode.children[1]) {
            evaluate(elseNode.children[1], env, _this, func);
        }
    }
}

function _new(node, env, _this, func) {
    const children = node.children;
    const calleeNode = children[1];
    let __this = {};
    const callee = evaluate(calleeNode, env, __this, func, true).callee;
    if (!callee.RETURN) {
        __this.___proto___ = callee.prototype;
    }
    else {
        __this = callee.RETURN;
    }
    return __this;
}

function comma(node, env, _this, func) {
    const children = node.children;
    const car = children[node.token === 'COMMA_REST' ? 1 : 0];
    const cadr = children.find(child=>child.token === 'COMMA_REST');
    const ret = evaluate(car, env, _this, func);

    if (cadr) {
        return comma(cadr, env, _this, func);
    }
    else {
        return ret;
    }
}

function assign(node, env, _this, func) {
    const children = node.children;
    const leftNode = children[0];
    const rightNode = children[2];
    const operator = children[1].token;

    const left = leftNode.token === 'LVAL' ? lVal(leftNode, env, null, _this) : {
        context: lookupVariable(leftNode.token, env, _this, func).env
    };
    const ret = evaluate(rightNode, env, _this, func);

    if (leftNode.token === 'LVAL') {
        let ref = left.context;
        const prevVal = ref[left.lastRef];
        switch (operator) {
            case '=':
                ref[left.lastRef] = ret;
                break;
            case '+=':
                ref[left.lastRef] = prevVal + ret;
                break;
            case '-=':
                ref[left.lastRef] = prevVal - ret;
                break;
            case '*=':
                ref[left.lastRef] = prevVal * ret;
                break;
            case '/=':
                ref[left.lastRef] = prevVal / ret;
                break;
            case '%=':
                ref[left.lastRef] = prevVal % ret;
                break;
        }
    }
    else {
        let ref = left.context[leftNode.token];
        const refType = ref.type;
        const prevVal = refType === 'variable' ? ref.value : ref;
        switch (operator) {
            case '=':
                if (refType === 'variable') {
                    ref.value = ret;
                }
                else {
                    ref = ret;
                }
                break;
            case '+=':
                if (refType === 'variable') {
                    ref.value = prevVal + ret;
                }
                else {
                    ref = prevVal + ret;
                }
                break;
            case '-=':
                if (refType === 'variable') {
                    ref.value = prevVal - ret;
                }
                else {
                    ref = prevVal - ret;
                }
                break;
            case '*=':
                if (refType === 'variable') {
                    ref.value = prevVal * ret;
                }
                else {
                    ref = prevVal * ret;
                }
                break;
            case '/=':
                if (refType === 'variable') {
                    ref.value = prevVal / ret;
                }
                else {
                    ref = prevVal / ret;
                }
                break;
            case '%=':
                if (refType === 'variable') {
                    ref.value = prevVal % ret;
                }
                else {
                    ref = prevVal % ret;
                }
                break;
        }
    }

    return ret;
}

function threeItemOperation(node, env, _this, func) {
    const children = node.children;
    const firstItem = children[0];
    const secondItem = children[2];
    const thirdItem = children[4];

    if (evaluate(firstItem, env, _this)) {
        return evaluate(secondItem, env, _this, func);
    }
    return evaluate(thirdItem, env, _this, func);
}

function twoItemOperation(node, env, _this, func) {
    const children = node.children;
    const car = children[0];

    let rest = children[1];
    let ret = evaluate(car, env, _this, func);

    while (rest) {
        const operator = rest.children[0].token;
        const operatee = evaluate(rest.children[1], env, _this, func);

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
            case '<':
                ret = ret < operatee;
                break;
            case '>':
                ret = ret > operatee;
                break;
            case '<=':
                ret = ret <= operatee;
                break;
            case '>=':
                ret = ret >= operatee;
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
            case 'instanceof':
                let instRet = false;
                while (ret.___proto___) {
                    if (ret.___proto___ === operatee.prototype) {
                        instRet = true;
                        break;
                    }
                    ret = ret.___proto___;
                }
                return instRet;
                break;
            case 'in':
                let opr = operatee;
                let isIn = false;
                do {
                    for (var key in opr) {
                        if (opr.hasOwnProperty(key)) {
                            if (key == ret) {
                                isIn = true;
                                break;
                            }
                        }
                    }
                    opr = opr.___proto___;
                } while (opr);
                ret = isIn;
                break;
            case '&&':
                if (ret) {
                    ret = operatee;
                }
                break;
            case '||':
                if (!ret) {
                    ret = operatee;
                }
                break;
        }

        rest = rest.children.find(child=>child.token.search('_REST') !== -1);
    }

    return ret;
}

function _return(node, env, _this, func) {
    const children = node.children;
    const ret = children[1];
    if (ret && ret.token !== ';') {
        func.RETURN = evaluate(ret, env, _this, func);
    }
}

function object(node, env, _this, func) {
    const children = node.children;
    const objCont = children[1].token !== '}' ? children[1] : null;
    if (objCont) {
        return objContent(objCont, env, {}, _this, func);
    }
    else {
        return {};
    }
}

function objContent(node, env, ret, _this, func) {
    const children = node.children;
    const key = children[0].token;
    const val = children[2];
    const restContent = children.find(child=>child.token === 'OBJECT_CONTENT');
    ret[key] = evaluate(val, env, _this, func);
    if (restContent) {
        objContent(restContent, env, ret, _this, func);
    }
    return ret;
}

function array(node, env, _this, func) {
    const children = node.children;
    const content = children[1].token !== ']' ? children[1] : null;
    return content ? arrayContent(content, env, [], _this, func) : [];
}

function arrayContent(node, env, ret, _this, func) {
    const children = node.children;
    const car = children[0];
    const cadr = children[1];
    const rest = children.find(child=>child.token === 'COMMA_REST');

    if (car.token !== ',') {
        ret.push(evaluate(car, env, _this, func));
    }
    else {
        ret.push(evaluate(cadr, env, _this, func));
    }
    if (rest) {
        arrayContent(rest, env, ret, _this);
    }

    return ret;
}

function stmts(node, env, _this, func) {
    const children = node.children;
    const stmt = children[0];
    const rest = children.find(child=>child.token === 'STMTS');
    evaluate(stmt, env, _this, func);

    if (rest) {
        stmts(rest, env, _this, func);
    }
}

function block(node, env, _this, func) {
    const children = node.children;
    const stmtsNode = children[1];

    if (stmtsNode.token === 'STMTS') {
        stmts(stmtsNode, env, _this, func);
    }
    else {
        evaluate(stmtsNode, env, _this, func);
    }
}

function _var(node, env, _this, func) {
    const body = node.children[1];
    const id = body.children[0];
    const assign = body.children[1];
    const rest = body.children.find(child=>child.token === 'VAR_BODY_REST');

    if (assign.token === '=') {
        const valObj = body.children[2];
        let valT = valObj.token;

        if (valT === 'FUNCTION' && env[id.token]) {
            env[id.token] = env[valObj.identifier];
            delete env[valObj.identifier];
            valObj.identifier = id.token;
        }
        else if (env[id.token]) {
            env[id.token].value = evaluate(valObj, env, _this, func);
        }
    }

    if (rest) {
        _var(rest, env, _this, func);
    }
}

function factor(node, env, _this, func) {
    const children = node.children;
    const car = children[0];
    const cadr = children[1];

    if (!cadr) {
        return evaluate(car, env, _this, func);
    }

    switch (car.token) {
        case '!':
            return !evaluate(cadr, env, _this, func);
        case '(':
            return evaluate(cadr, env, _this, func);
        case '-':
            return -evaluate(cadr, env, _this, func);
        case '+':
            return +evaluate(cadr, env, _this, func);
        case '~':
            return ~evaluate(cadr, env, _this, func);
        case 'delete':
            return _delete(cadr, env, _this, func);
        case 'typeof':
            return typeof evaluate(cadr, env, _this, func);
        case 'void':
            return void evaluate(cadr, env, _this, func);
        case '++':
            return selfPlusOrMinus(cadr, env, _this, true, false, func);
        case '--':
            return selfPlusOrMinus(cadr, env, _this, false, false, func);
    }
}

function _delete(cadr, env, _this, func) {
    const lvalRet = cadr.token === 'LVAL' ? lVal(cadr, env, null, _this, func) : {
        value: lookupVariable(cadr.token, env, _this, func).value,
        context: env,
        lastRef: cadr.token
    };
    return delete lvalRet.context[lvalRet.lastRef];
}

function selfPlusOrMinus(cadr, env, _this, isPlus, backward, func) {
    const lvalRet = cadr.token === 'LVAL' ? lVal(cadr, env, _this) : {
        value: lookupVariable(cadr.token, env, _this, func).value,
        context: lookupVariable(cadr.token, env, _this, func).env,
        lastRef: cadr.token
    };
    const context = lvalRet.context;
    const lastRef = lvalRet.lastRef;
    const newVal = context[lastRef] + (isPlus ? 1 : -1);

    if (!backward) {
        context[lastRef] = newVal;
        return context[lastRef];
    }
    else {
        const currentVal = context[lastRef];
        context[lastRef] = newVal;
        return currentVal;
    }
}

function lookupVariable(id, env, _this, func) {
    if (id === 'this') {
        return { env: env, value: _this };
    }
    const ret = Object.keys(env).find(key=>
        key === id
    );

    if (ret) {
        let val;
        if (env[ret].type === 'variable') {
            val = env[ret].value;
            if (func) {
                const argsKey = '__actual_args_' + func.callId + '__';
                if (val[argsKey] != null) {
                    val = val[argsKey];
                }
            }
        }
        else {
            val = env[ret];
        }
        return {
            value: val,
            env: env
        };
    }
    else if (env.__1024__) {
        return lookupVariable(id, env.__1024__, _this, func);
    }
    else {
        throw new Error(id + ' is not defined!');
    }
}

function lookupAttrOnProtoChain(context, id) {
    if (context[id] !== undefined) {
        return context[id];
    }
    else {
        let ret;
        while (context.___proto___) {
            context = context.___proto___;
            if (context[id] !== undefined) {
                ret = context[id];
                break;
            }
        }
        return ret;
    }
}

function lVal(node, env, context, _this, func) {
    const children = node.children;
    const car = children[0];
    const cadr = children[1];
    const id = car.type === 'id' ? car.token : cadr.token;
    const rest = children.find(child=>child.token === 'LVAL_REST');

    if (rest) {
        if (!context || context.isGlobal) {
            return lVal(rest, env, lookupVariable(id, env, _this, func).value, _this, func);
        }
        else {
            return lVal(rest, env, lookupAttrOnProtoChain(context, id), _this, func);
        }
    }
    else {
        if (!context || context.isGlobal) {
            return {
                context: lookupVariable(id, env, _this, func).env,
                value: lookupVariable(id, env, _this, func).value,
                lastRef: id
            };
        }
        else {
            return {
                context: context,
                value: lookupAttrOnProtoChain(context, id),
                lastRef: id
            };
        }
    }
}

function accessCall(node, env, context, _this, isNew, parentFunc) {
    const children = node.children;
    const car = children[0];
    let currentContext = context;
    let func = null;
    let callee = null;

    if (car.token === ')') {
        return [];
    }

    if (car.token === 'LVAL' || car.type === 'id') {
        const lvalRet = car.token === 'LVAL' ? lVal(car, env, context, _this) : {
            value: context[car.token],
            context: context
        };

        func = lvalRet.value;
        callee = func;
        func.THIS = !isNew ? lvalRet.context : _this;
        let currentNodeIndex = 1;
        let argsNode = children[currentNodeIndex];

        while (argsNode && argsNode.token === 'ACCESS_CAL_ARGS') {
            if (!func || func.type !== 'function') {
                throw new Error(func + ' is not callable.');
            }
            //console.log(func.callId, parentFunc && parentFunc.callId);
            const actualArgs = accessCallArgs(argsNode, env, _this, isNew, func);
            applyActualArgs(actualArgs, func.args, func.scope, ++func.callId);
            //++func.callId;
            block(func.body, func.scope, func.THIS, func);
            --func.callId;
            currentContext = func.RETURN;
            argsNode = children[++currentNodeIndex];

            func.arguments = actualArgs || [];
            func.arguments.callee = func;
            if (func.RETURN && func.RETURN.type === 'function') {
                callee = func.RETURN;
            }
            func = func.RETURN;
        }
    }

    const dotIndex = children.findIndex(child=>child.token === '.');

    if (dotIndex !== -1) {
        if (typeof currentContext === 'function' || typeof currentContext === 'object') {
            const next = children[dotIndex + 1];
            if (next.type === 'id') {
                currentContext = currentContext[next.token];
            }
            else if (next.token === 'LVAL') {
                currentContext = lVal(next, env, currentContext, _this).value;
            }
            else if (next.token === 'ACCESS_CALL') {
                currentContext = isNew ?
                    accessCall(next, env, currentContext, _this, isNew).currentContext :
                    accessCall(next, env, currentContext, _this, isNew);
            }
        }
        else {
            throw new Error('reference error: ' + currentContext + ' is not an object or function.');
        }
    }

    return isNew ? {
        context: currentContext,
        callee: callee
    } : currentContext;
}

function applyActualArgs(actualArgs, params, scope, callId) {
    actualArgs.forEach((arg, i)=> {
        scope[params[i]].value['__actual_args_' + (callId) + '__'] = arg;
    });
}

function accessCallArgs(node, env, _this, isNew, func) {
    //console.log(func.callId)
    const children = node.children;
    const args = children[1];
    if (args.token !== 'CALL_ARGS') {
        const ret = evaluate(args, env, _this);
        return ret != null ? [evaluate(args, env, _this, func, isNew)] : [];
    }
    else {
        return multiArgs(args, env, [], _this, func, isNew);
    }
}

function multiArgs(node, env, ret, _this, func, isNew) {
    if (node.token !== 'CALL_ARGS') {
        return evaluate(node, env, _this, func, isNew);
    }
    const children = node.children;
    const car = children[0];
    const rest = children[2];
    ret.push(evaluate(car, env, _this, func, isNew));
    if (rest.token !== 'CALL_ARGS') {
        ret.push(evaluate(rest, env, _this, func, isNew));
    }
    multiArgs(rest, env, ret, _this, func, isNew);
    return ret;
}

const global = { isGlobal: true };

//js求值器,根据抽象语法树运行js代码
module.exports = (ast)=> {
    //提升函数声明
    hoistFunctionDeclaration(ast.root, global);
    //提升变量声明
    hoistVariables(ast.root, global);
    //求值
    evaluate(ast.root, global);
    clearEnv(global);
    return {
        ast: ast,
        env: global
    };
};