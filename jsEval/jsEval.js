/**
 * JS代码求值器(严格模式)
 * 根据生成的抽象语法树运行js代码
 */
'use strict';
const UNDEF = 'UNDEF';

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
    }, []).map(arg=>arg.token);
}

function extractFunctionDeclarationFromStmt(stmt, env, oneOff) {
    const stmtChildren = stmt.children;
    if (stmtChildren) {
        const funcNonTermIndex = stmtChildren.findIndex(child=>child.token === 'FUNCTION');
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
            const identifier = !oneOff ? funcName.token : Date.now();
            env[identifier] = {
                parent: env,
                type: 'function',
                name: funcName ? funcName.token : null,
                body: funcBody,
                args: funcArgs,
                length: funcArgs.length,
                scope: funcScope,
                oneOff: oneOff
            };
            stmt.identifier = identifier;
            hoistFunctionDeclaration(funcBody, funcScope);
        }
        else if (funcNonTermIndex !== -1) {
            extractFunctionDeclarationFromStmt(stmtChildren[funcNonTermIndex], env, true);
        }
        else {
            stmtChildren.forEach(child=>extractFunctionDeclarationFromStmt(child, env, true));
        }
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
            type: 'variable',
            value: UNDEF
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
                delete item.parent;
                delete item.body;
                clearEnv(item.scope);
            }
        }
    }
}

function evaluate(node, env) {
    const token = node.token;
    switch (token) {
        case 'STMTS':
            stmts(node, env);
    }
}

function stmts(node, env) {
    const children = node.children;
    const stmt = children[0];
    const stmtToken = stmt.token;
    const rest = children[1].token !== ';' ? children[1] : children[2];
    switch (stmtToken) {
        case 'VAR':
            _var(stmt, env);
            if (rest) {
                stmts(rest, env);
            }
    }
}

function _var(node, env) {
    const body = node.children[1];
    const id = body.children[0];
    const assign = body.children[1];
    const rest = body.children.find(child=>child.token === 'VAR_BODY_REST');
    if (assign.token === '=') {
        const valObj = body.children[2];
        let valT = valObj.token;
        let valType = valObj.type;
        if (valT === 'FUNCTION') {
            env[id.token] = env[valObj.identifier];
            delete env[valObj.identifier];
        }
        else if (env[id.token]) {
            env[id.token].value = valObj;
        }
        else {
            global[id.token] = {
                value: valObj,
                valType: valType
            };
        }
    }
    if (rest) {
        _var(rest, env);
    }
}

const global = {};

module.exports = (ast)=> {
    hoistFunctionDeclaration(ast.root, global);
    hoistVariables(ast.root, global);
    evaluate(ast.root, global);
    clearEnv(global);
    return {
        ast: ast,
        env: global
    };
};
