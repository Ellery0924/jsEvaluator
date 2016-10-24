/**
 * JS代码求值器(严格模式)
 * 根据生成的抽象语法树运行js代码
 */
'use strict';
const callStack = [];
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
        const restStmts = findNodeInChildrenBy(node, 'STMTS');
        extractFunctionDeclarationFromStmt(stmt, env);

        if (restStmts) {
            hoistFunctionDeclaration(restStmts, env);
        }
        else {
            const restStmt = node.children.find(child=>child !== stmt && child.token !== ';');
            if (restStmt) {
                hoistFunctionDeclaration(restStmt, env);
            }
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

function funcTag(node, funcId) {
    node.funcId = funcId;
    if (node.children) {
        node.children.forEach(child=>funcTag(child, funcId));
    }
}

function extractFunctionDeclarationFromStmt(node, env) {
    const children = node.children;

    if (node.token === 'FUNCTION') {
        const funcName = children[1].type === 'id' ? children[1].token : null;
        const funcBodyNode = findNodeInChildrenBy(node, 'BLOCK');
        const argsNode = children.slice(
            children.findIndex(child=>child.token === '(') + 1,
            children.findIndex(child=>child.token === ')')
        )[0];

        function getArgs(node, ret) {
            if (!node) {
                return ret;
            }
            if (node.type === 'id') {
                ret.push(node.token);
            }
            else {
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
                type: 'function'
            }
        };

        funcTag(node, funcId);
        hoistFunctionDeclaration(funcBodyNode, scope);
    }
    else if (children) {
        children.forEach(child=>hoistFunctionDeclaration(child, env));
    }
}

function findNodeInChildrenBy(node, cond, by) {
    return node && node.children ? node.children.find(child=>
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
        }
        else {
            const rest = children.find(child=>child !== stmt && child.token !== ';');
            if (rest) {
                hoistVariableInStmt(rest, env);
            }
        }
    }
    else if (node.token === 'BLOCK') {
        const stmts = findNodeInChildrenBy(node, 'STMTS');
        if (stmts) {
            hoistVariable(stmts, env);
        }
        else if (children[1].token !== '}') {
            hoistVariableInStmt(children[1], env);
        }
    }
    else {
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
        children.forEach(child=> {
            if (child !== varBodyRest && child !== idNode && child.token !== '=') {
                hoistVariableInStmt(child, env);
            }
        });
    }
    else if (node.token === 'FUNCTION') {
        const funcBody = findNodeInChildrenBy(node, 'BLOCK');
        const funcId = node.funcId;
        if (env[funcId].type === 'function') {
            const scope = env[funcId].value.scope;
            hoistVariable(funcBody, scope);
        }
    }
    else if (children) {
        children.forEach(child=> {
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
        }
    }
}

function stmts(node, env) {
    const children = node.children;
    const stmt = children[0];
    const rest = findNodeInChildrenBy(node, 'STMTS');
    evaluate(stmt, env);
    if (rest) {
        stmts(rest, env);
    }
    else {
        const lastStmt = children.find(child=>child !== stmt && child.token !== ';');
        evaluate(lastStmt, env);
    }
}

function _var(node, env) {
    const varBody = findNodeInChildrenBy(node, 'VAR_BODY');
    return _varBody(varBody, env);
}

function _varBody(node, env) {
    const children = node.children;
    const idNode = children[0];
    const rest = findNodeInChildrenBy(node, 'VAR_BODY_REST');
    const valueNode = children.find(child=>
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
    }
    else {
        return lookupId(id, env);
    }
}

function lookupId(id, env) {
    //合并实参
    if (callStack.length) {
        env = Object.assign({}, callStack[callStack.length - 1].actualArgs, env);
    }

    if (env[id]) {
        return env[id];
    }
    else if (env.___parent___) {
        return lookupId(id, env.___parent___);
    }
    else {
        return undefined;
    }
}

function _object(node, env) {
    const content = findNodeInChildrenBy(node, 'OBJECT_CONTENT');
    if (content) {
        return objContent(content, env, {});
    }
    else {
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
    }
    else {
        return ret;
    }
}

function array(node, env) {
    const content = node.children.find(child=>child.token !== ']' && child.token !== '[');
    if (content) {
        if (content.token === 'COMMA') {
            return arrContent(content, env, []);
        }
        else {
            return [evaluate(content, env)];
        }
    }
    else {
        return [];
    }
}

function arrContent(node, env, ret) {
    const car = node.children[node.token === 'COMMA' ? 0 : 1];
    ret.push(evaluate(car, env));
    const rest = findNodeInChildrenBy(node, 'COMMA_REST');
    if (rest) {
        return arrContent(rest, env, ret);
    }
    else {
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
            return typeof evaluate(rest, env);
        case 'void':
            evaluate(rest, env);
            return;
        case '++':
        case '--':
            return selfPlusOrMinus(rest, env, car);
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
        }
        else {
            context[lastRef] = currentVal - 1;
            return context[lastRef];
        }
    }
    else {
        if (operator === '++') {
            context[lastRef] = currentVal + 1;
            return currentVal;
        }
        else {
            context[lastRef] = currentVal - 1;
            return currentVal;
        }
    }
}

function twoItemOperation(node, env) {
    const children = node.children;
    const ret = evaluate(children[0], env);
    const rest = children.find(child=>child.token.match(/_REST/));
    const operator = rest.children[0].token;
    const operatee = evaluate(rest.children[1], env);

    switch (operator) {
        case '*':
            return ret * operatee;
        case '/':
            return ret / operatee;
        case '%':
            return ret % operatee;
        case '+':
            return ret + operatee;
        case '-':
            return ret - operatee;
        case '>':
            return ret > operatee;
        case '<':
            return ret < operatee;
        case '>=':
            return ret >= operatee;
        case '<=':
            return ret <= operatee;
        case '===':
            return ret === operatee;
        case '!==':
            return ret !== operatee;
        case '==':
            return ret == operatee;
        case '!=':
            return ret != operatee;
        case '&&':
            return ret && operatee;
        case '||':
            return ret || operatee;
    }
}

function threeItemOperation(node, env) {
    const children = node.children;
    const condNode = children[0];
    const thenNode = children[2];
    const elseNode = children[4];

    if (evaluate(condNode, env)) {
        return evaluate(thenNode, env);
    }
    else {
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
    const idNode = children[1];
    const rest = findNodeInChildrenBy(node, 'LVAL_REST');
    if (rest) {
        return lValRest(rest, env, context[idNode.token]);
    }
    else {
        return { context: context, lastRef: idNode.token, value: context[idNode.token] };
    }
}

function accessRef(node, env) {
    if (node.token === 'LVAL') {
        return lVal(node, env);
    }
    else {
        return { context: lookupId(node.token, env), lastRef: 'value' }
    }
}

function accessValue(node, env) {
    if (node.token === 'LVAL') {
        return lVal(node, env).value;
    }
    else {
        return lookupId(node, env).value;
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

function evaluate(node, env) {
    if (node) {
        const token = node.token;
        if (node.type === 'NON_TERM') {
            console.log('evaluating:', token);
            switch (token) {
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
                    return twoItemOperation(node, env);
                case 'THREE_ITEM_OPERATION':
                    return threeItemOperation(node, env);
                case 'LVAL':
                    return lVal(node, env);
                case 'SELF_PLUS_OR_MINUS_BACKWARD':
                    const operator = node.children[1].token;
                    const operatee = node.children[0];
                    return selfPlusOrMinus(operatee, env, operator, true);
                case 'ASSIGN':
                    return assign(node, env);
                case 'FUNCTION':
                    return accessValue(node.funcId, env);
            }
        }
        else {
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

const global = { isGlobal: true };

//js求值器,根据抽象语法树运行js代码
module.exports = (ast)=> {
    //提升函数声明
    hoistFunctionDeclaration(ast.root, global);
    //提升变量声明
    hoistVariable(ast.root, global);
    //求值
    evaluate(ast.root, global);
    clearEnv(global);
    return {
        ast: ast,
        env: global
    };
};