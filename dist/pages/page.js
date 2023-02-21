'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Nexmo Client SDK
 *
 * Copyright (c) Nexmo Inc.
*/
const nexmoClientError_1 = require("../nexmoClientError");
/** Page Class for Paginated Results
 *
 * @class Page
 * @param {number} page_size the number of resources returned in a single request list
 * @param {string} order 'asc' or 'desc' ordering of resources (usually based on creation time)
 * @param {string} cursor cursor parameter to access the next or previous page of a data set
 * @param {Application} application - the parent Application
 * @param {string} [event_type] the type of event used to filter event requests
 *
 * @private
*/
class Page {
    constructor(params = {}) {
        this.page_size = params.page_size;
        this.order = params.order;
        this.cursor = params.cursor;
        this.application = params.application;
        if (params.event_type && params.event_type.length > 0) {
            this.event_type = params.event_type;
        }
    }
    /**
     * Check if previous page exists
     * @returns {Boolean}
     * @example <caption>Check if previous page exists</caption>
     * // currentPage is the current Conversations or Events Page
     * currentPage.hasPrev() // true or false
    */
    hasPrev() {
        return this.cursor.prev ? this.cursor.prev.length > 0 : false;
    }
    /**
     * Check if next page exists
     * @returns {Boolean}
     * @example <caption>Check if next page exists</caption>
     * // currentPage is the current Conversations or Events Page
     * currentPage.hasNext() // true or false
    */
    hasNext() {
        return this.cursor.next ? this.cursor.next.length > 0 : false;
    }
    /**
      * Create config params for paginationRequest
      * @param {string} cursor cursor parameter to access the next or previous page of a data set
      * @returns {Object}
     * @private
    */
    _getConfig(cursor) {
        const config = {
            page_size: this.page_size,
            order: this.order,
            cursor,
            ...(this.event_type && { event_type: this.event_type })
        };
        return config;
    }
    /**
     * Create a nexmoClientError when page does not exist
     * @private
    */
    _getError() {
        return Promise.reject(new nexmoClientError_1.NexmoClientError('error:invalid-cursor'));
    }
}
exports.default = Page;
module.exports = Page;
