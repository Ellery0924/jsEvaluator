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
                    type: 'variable'
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
                prototype: {}
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

function evaluate(node, env, _this, func) {
    const token = node.token;
    const type = node.type;
    if (type === 'NON_TERM') {
        console.log('evaluating: ' + token);
        switch (token) {
            case 'STMTS':
                stmts(node, env, _this);
                break;
            case 'OBJECT':
                return object(node, env, _this);
            case 'ARRAY':
                return array(node, env, _this);
            case 'VAR':
                return _var(node, env, _this);
            case 'FACTOR':
                return factor(node, env, _this);
            case 'FUNCTION':
                return lookupVariable(node.identifier, env, _this);
            case 'LVAL':
                return lVal(node, env, null, _this).value;
            case 'ACCESS_CALL':
                return accessCall(node, env, global, _this);
            case 'BLOCK':
                block(node, env, _this);
                break;
            case 'RETURN':
                _return(node, env, _this, func);
                break;
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
                return lookupVariable(token, env);
        }
    }
}

function _return(node, env, _this, func) {
    const children = node.children;
    const ret = children[1];
    if (ret && ret.token !== ';') {
        func.RETURN = evaluate(ret, env, _this);
    }
}

function object(node, env, _this) {
    const children = node.children;
    const objCont = children[1].token !== '}' ? children[1] : null;
    if (objCont) {
        return objContent(objCont, env, {}, _this);
    }
    else {
        return {};
    }
}

function objContent(node, env, ret, _this) {
    const children = node.children;
    const key = children[0].token;
    const val = children[2];
    const restContent = children.find(child=>child.token === 'OBJECT_CONTENT');
    ret[key] = evaluate(val, env, _this);
    if (restContent) {
        objContent(restContent, env, ret, _this);
    }
    return ret;
}

function array(node, env, _this) {
    const children = node.children;
    const content = children[1].token !== ']' ? children[1] : null;
    return content ? arrayContent(content, env, [], _this) : [];
}

function arrayContent(node, env, ret, _this) {
    const children = node.children;
    const car = children[0];
    const cadr = children[1];
    const rest = children.find(child=>child.token === 'COMMA_REST');
    if (car.token !== ',') {
        ret.push(evaluate(car, env, _this));
    }
    else {
        ret.push(evaluate(cadr, env, _this));
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
}

function _var(node, env, _this) {
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
            env[id.token].value = evaluate(valObj, env, _this);
        }
    }

    if (rest) {
        _var(rest, env, _this);
    }
}

function factor(node, env, _this) {
    const children = node.children;
    const car = children[0];
    const cadr = children[1];
    if (!cadr.children) {
        return evaluate(car, env, _this);
    }
    switch (car.token) {
        case '!':
            return !evaluate(cadr, env, _this);
        case '(':
            return evaluate(cadr, env, _this);
        case '-':
            return -evaluate(cadr, env, _this);
        case '+':
            return +evaluate(cadr, env, _this);
        case '~':
            return ~evaluate(cadr, env, _this);
    }
}

function lookupVariable(id, env, _this) {
    if (id === 'this') {
        return _this;
    }
    const ret = Object.keys(env).find(key=>key === id);
    if (ret) {
        return env[ret].type === 'variable' ? env[ret].value : env[ret];
    }
    else if (env.__1024__) {
        return lookupVariable(id, env.__1024__);
    }
    else {
        throw new Error(id + ' is not defined!');
    }
}

function lVal(node, env, context, _this) {
    const children = node.children;
    const car = children[0];
    const cadr = children[1];
    const id = car.type === 'id' ? car.token : cadr.token;
    const rest = children.find(child=>child.token === 'LVAL_REST');

    if (rest) {
        if (!context || context.isGlobal) {
            return lVal(rest, env, lookupVariable(id, env, _this), _this);
        }
        else {
            return lVal(rest, env, context[id], _this);
        }
    }
    else {
        if (!context || context.isGlobal) {
            return {
                context: global,
                value: lookupVariable(id, env, _this)
            };
        }
        else {
            return {
                context: context,
                value: context[id]
            };
        }
    }
}

function accessCall(node, env, context, _this) {
    const children = node.children;
    const car = children[0];
    let currentContext = context;

    if (car.token === ')') {
        return [];
    }

    if (car.token === 'LVAL' || car.type === 'id') {
        const lvalRet = car.token === 'LVAL' ? lVal(car, env, context, _this) : {
            value: context.isGlobal ? lookupVariable(car.token, env, _this) : context[car.token],
            context: context
        };

        let func = lvalRet.value;
        func.THIS = lvalRet.context;
        let currentNodeIndex = 1;
        let argsNode = children[currentNodeIndex];

        while (argsNode && argsNode.token === 'ACCESS_CAL_ARGS') {
            if (!func || func.type !== 'function') {
                throw new Error(func + ' is not callable.');
            }

            const actualArgs = accessCallArgs(argsNode, env, _this);
            applyActualArgs(actualArgs, func.args, func.scope);
            block(func.body, func.scope, func.THIS, func);
            currentContext = func.RETURN;
            argsNode = children[++currentNodeIndex];
            func = func.RETURN;
        }
    }

    if (children[2] && children[2].token === '.') {
        if (typeof currentContext === 'function' || typeof currentContext === 'object') {
            const next = children[3];
            if (next.type === 'id') {
                currentContext = currentContext[next.token];
            }
            else if (next.token === 'LVAL') {
                currentContext = lVal(next, env, currentContext, _this).value;
            }
            else if (next.token === 'ACCESS_CALL') {
                currentContext = accessCall(next, env, currentContext, _this);
            }
        }
        else {
            throw new Error('reference error: ' + currentContext + ' is not an object or function.');
        }
    }

    return currentContext;
}

function applyActualArgs(actualArgs, params, scope) {
    actualArgs.forEach((arg, i)=> {
        scope[params[i]].value = arg;
    });
}

function accessCallArgs(node, env, _this) {
    const children = node.children;
    const args = children[1];
    if (args.token !== 'CALL_ARGS') {
        const ret = evaluate(args, env, _this);
        return ret ? [evaluate(args, env, _this)] : [];
    }
    else {
        return multiArgs(args, env, [], _this);
    }
}

function multiArgs(node, env, ret, _this) {
    if (node.token !== 'CALL_ARGS') {
        return evaluate(node, env, _this);
    }
    const children = node.children;
    const car = children[0];
    const rest = children[2];
    ret.push(evaluate(car, env, _this));
    if (rest.token !== 'CALL_ARGS') {
        ret.push(evaluate(rest, env, _this));
    }
    multiArgs(rest, env, ret, _this);
    return ret;
}

const global = { isGlobal: true };

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