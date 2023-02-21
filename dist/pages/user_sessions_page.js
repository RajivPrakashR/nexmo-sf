'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Nexmo Client SDK
 *
 * Copyright (c) Nexmo Inc.
*/
const page_1 = __importDefault(require("./page"));
const user_session_1 = __importDefault(require("../user_session"));
/**
 * A UserSessions Page
 *
 * @class UserSessionsPage
 * @param {Map} items map of UserSessions fetched in the paginated query
 * @extends Page
*/
class UserSessionsPage extends page_1.default {
    constructor(params) {
        super(params);
        this.items = new Map();
        // Iterate through the UserSessions
        params.items.forEach((userSession) => {
            this.items.set(userSession.id, new user_session_1.default(this.application, userSession));
        });
    }
    /**
     * Fetch the previous page if exists
     * @returns {Promise<Page>}
     * @example <caption>Fetch the previous page if exists</caption>
     *  currentUserSessionsPage.getPrev().then((prevUserSessionsPage) => {
     *    console.log("previous user sessions page ", prevUserSessionsPage);
     *  }).catch((error) => {
     *    console.error("error getting previous user sessions page ", error);
     *  });
    */
    getPrev() {
        if (!this.hasPrev())
            return this._getError();
        return this.application.getUserSessions(this._getConfig(this.cursor.prev));
    }
    /**
     * Fetch the next page if exists
     * @returns {Promise<Page>}
     * @example <caption>Fetch the next page if exists</caption>
     *  currentUserSessionsPage.getNext().then((nextUserSessionsPage) => {
     *    console.log("next user sessions page ", nextUserSessionsPage);
     *  }).catch((error) => {
     *    console.error("error getting next user sessions page ", error);
     *  });
    */
    getNext() {
        if (!this.hasNext())
            return this._getError();
        return this.application.getUserSessions(this._getConfig(this.cursor.next));
    }
}
exports.default = UserSessionsPage;
module.exports = UserSessionsPage;
