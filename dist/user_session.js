'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Nexmo Client SDK
 *  UserSession Object Model
 *
 * Copyright (c) Nexmo Inc.
 */
const WildEmitter = require('wildemitter');
class UserSession {
    constructor(application, params) {
        var _a, _b, _c, _d;
        this.application = application;
        this.id = (_b = (_a = params) === null || _a === void 0 ? void 0 : _a.id, (_b !== null && _b !== void 0 ? _b : null));
        this._embedded = (_d = (_c = params) === null || _c === void 0 ? void 0 : _c._embedded, (_d !== null && _d !== void 0 ? _d : null));
        WildEmitter.mixin(UserSession);
    }
}
exports.default = UserSession;
module.exports = UserSession;
