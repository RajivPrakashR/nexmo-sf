'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Nexmo Client SDK
 *  SIP Events Handler
 *
 * Copyright (c) Nexmo Inc.
 */
const loglevel_1 = require("loglevel");
/**
 * Handle sip Events
 *
 * @class SipEventHandler
 * @private
  */
class SipEventHandler {
    constructor(application) {
        this.log = loglevel_1.getLogger(this.constructor.name);
        this.application = application;
        this._handleSipCallEventMap = {
            'sip:hangup': this._processSipHangup,
            'sip:ringing': this._processSipRinging
        };
    }
    /**
     * Entry point for sip events
     * The event belongs to a call Object
     * @private
    */
    _handleSipCallEvent(event) {
        this.log.debug("_handleSipCallEvent: ", { event });
        if (!this.application.calls.has(event.cid)) {
            this.log.warn('There is no call object for this Conversation id.');
            return;
        }
        const event_call = this.application.calls.get(event.cid);
        if (this._handleSipCallEventMap.hasOwnProperty(event.type)) {
            return this._handleSipCallEventMap[event.type].call(this, event_call, event);
        }
    }
    /**
     * Handle sip:hangup event
     *
     * @param {object} event_call
     * @private
     */
    _processSipHangup(event_call, event) {
        this.log.debug("_processSipHangup: ", event);
        event_call._handleStatusChange(event);
    }
    /**
     * Handle sip:ringing event
     *
     * @param {object} event_call
     * @private
     */
    _processSipRinging(event_call, event) {
        this.log.debug("_processSipRinging: ", event);
        event_call._handleStatusChange(event);
    }
}
exports.default = SipEventHandler;
module.exports = SipEventHandler;
