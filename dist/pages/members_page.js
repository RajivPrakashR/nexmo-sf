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
const member_1 = __importDefault(require("../member"));
/**
 * A Members Page
 *
 * @class MembersPage
 * @param {Map} items map of members fetched in the paginated query
 * @extends Page
*/
class MembersPage extends page_1.default {
    constructor(params) {
        super(params);
        this.conversation = params.conversation;
        this.items = new Map();
        // Iterate and create the conversations if not existent
        params.items.forEach((member) => {
            this.items.set(member.id, new member_1.default(this.conversation, member));
        });
    }
    /**
     * Fetch the previous page if exists
     * @returns {Promise<Page>}
     * @example <caption>Fetch the previous page if exists</caption>
     *  currentMembersPage.getPrev().then((prevMembersPage) => {
     *    console.log("previous members page ", prevMembersPage);
     *  }).catch((error) => {
     *    console.error("error getting previous members page ", error);
     *  });
    */
    getPrev() {
        if (!this.hasPrev())
            return this._getError();
        return this.conversation.getMembers(this._getConfig(this.cursor.prev));
    }
    /**
     * Fetch the next page if exists
     * @returns {Promise<Page>}
     * @example <caption>Fetch the next page if exists</caption>
     *  currentMembersPage.getNext().then((nextMembersPage) => {
     *    console.log("next members page ", nextMembersPage);
     *  }).catch((error) => {
     *    console.error("error getting next members page ", error);
     *  });
    */
    getNext() {
        if (!this.hasNext())
            return this._getError();
        return this.conversation.getMembers(this._getConfig(this.cursor.next));
    }
}
exports.default = MembersPage;
module.exports = MembersPage;
