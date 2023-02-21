"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Nexmo Client SDK
 *  RTC Events Handler
 *
 * Copyright (c) Nexmo Inc.
 */
const loglevel_1 = require("loglevel");
/**
 * Handle rtc Events
 *
 * @class RtcEventHandler
 * @private
 */
class RtcEventHandler {
    constructor(application) {
        this.log = loglevel_1.getLogger(this.constructor.name);
        this.application = application;
        this._handleRtcEventMap = {
            'rtc:transfer': this._processRtcTransfer,
            'rtc:answer': this._processRtcAnswer,
            'rtc:hangup': this._processRtcHangup
        };
    }
    /**
     * Entry point for rtc events
     * @param {object} event
     * @private
     */
    _handleRtcEvent(event) {
        if (this._handleRtcEventMap.hasOwnProperty(event.type)) {
            return this._handleRtcEventMap[event.type].call(this, event);
        }
    }
    /**
      * on transfer event
      * update the conversation object in the NXMCall,
      * update the media object in the new conversation
      * set `transferred_to` <Conversation> on the member that is transferred
      * @param {object} event
      * @private
    */
    _processRtcTransfer(event) {
        this.log.debug('_processRtcTransfer: ', { event });
        const old_conversation = this.application.conversations.get(event.body.transferred_from);
        const new_conversation = this.application.conversations.get(event.cid);
        const nxmCall = this.application.calls.get(event.body.transferred_from);
        if (!nxmCall) {
            this.log.warn('NXMCall transfer for unknown nxmCall');
            return;
        }
        // mark the transferred member in the old conversation
        nxmCall.conversation.members.get(event.body.was_member).transferred_to = new_conversation;
        nxmCall._setupConversationObject(new_conversation);
        nxmCall.transferred = true;
        this.application.calls.set(event.cid, nxmCall);
        this.application.calls.delete(event.body.transferred_from);
        // in case we joined in the middle of a transfer and we don't have the
        // previous conversation in our list yet
        if (old_conversation) {
            new_conversation.members.get(event.from).transferred_from = old_conversation;
            new_conversation.media._attachEndingEventHandlers();
            // Checking to see if old conversation has rtcObject, pc or activeStreams while new conversation does not and if so add
            // to new conversation the missing rtcObject, pc or activeStream
            if (Object.entries(new_conversation.media.rtcObjects).length === 0 && Object.entries(old_conversation.media.rtcObjects).length !== 0) {
                Object.assign(new_conversation.media.rtcObjects, old_conversation.media.rtcObjects);
            }
            if (!new_conversation.media.pc && old_conversation.media.pc) {
                Object.assign(new_conversation.media.pc = old_conversation.media.pc);
            }
            if (new_conversation.application.activeStreams.length === 0 && old_conversation.application.activeStreams.length > 0) {
                new_conversation.application.activeStreams = old_conversation.application.activeStreams;
            }
        }
    }
    /**
     * Handle rtc:answer event
     *
     * @param {object} event
     * @private
     */
    _processRtcAnswer(event) {
        this.log.debug('_processRtcAnswer: ', { event });
        if (this.application.calls.has(event.cid)) {
            this.application.calls.get(event.cid).id = event.body.rtc_id;
        }
    }
    /**
     * Handle rtc:hangup event
     *
     * @param {object} event
     * @private
     */
    _processRtcHangup(event) {
        this.log.debug('_processRtcHangup: ', { event });
        if (this.application.calls.has(event.cid)) {
            let call = this.application.calls.get(event.cid);
            call._handleStatusChange(event);
        }
    }
}
exports.default = RtcEventHandler;
module.exports = RtcEventHandler;
