'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Nexmo Client SDK
 *  Application Events Handler
 *
 * Copyright (c) Nexmo Inc.
 */
const loglevel_1 = require("loglevel");
const nxmEvent_1 = __importDefault(require("../events/nxmEvent"));
const nxmCall_1 = __importDefault(require("../modules/nxmCall"));
const utils_1 = __importDefault(require("../utils"));
const rtc_helper_1 = __importDefault(require("../modules/rtc_helper"));
/**
 * Handle Application Events
 *
 * @class ApplicationEventsHandler
 * @param {Application} application
 * @param {Conversation} conversation
 * @private
*/
class ApplicationEventsHandler {
    constructor(application) {
        this.log = loglevel_1.getLogger(this.constructor.name);
        this.application = application;
        this._handleApplicationEventMap = {
            'member:joined': this._processMemberJoined,
            'member:invited': this._processMemberInvited
        };
    }
    /**
      * Handle and event.
      *
      * Update the event to map local generated events
      * in case we need a more specific event to pass in the application listener
      * or f/w the event as it comes
      * @param {object} event
      * @private
    */
    handleEvent(event) {
        const conversation = this.application.conversations.get(event.cid);
        const copied_event = Object.assign({}, event);
        if (this._handleApplicationEventMap.hasOwnProperty(event.type)) {
            return this._handleApplicationEventMap[event.type].call(this, conversation, new nxmEvent_1.default(conversation, copied_event), event);
        }
        return new nxmEvent_1.default(conversation, copied_event);
    }
    /**
      * case: call to PSTN, after knocking event we receive joined
      * @private
    */
    _processMemberJoined(conversation, event, raw_event) {
        try {
            if (event.body.channel && this.application._call_draft_list.has(event.body.channel.id)) {
                this.log.debug("_processMemberJoined: outbound serverCall from sdk", { event });
                const nxmCall = this.application._call_draft_list.get(event.body.channel.id);
                let pc = ((nxmCall.rtcObjects || {})[event.body.channel.id] || {}).pc;
                nxmCall._setFrom(conversation.me);
                nxmCall._setupConversationObject(conversation, event.body.channel.id);
                // add the media objects to new conversation from placeholder in call
                conversation.media._attachEndingEventHandlers();
                // Checking to see if placeholder NxmCall has rtcObject, pc or activeStreams while new conversation does not and if so add
                // to new conversation the missing rtcObject, pc or activeStream
                if (Object.entries(conversation.media.rtcObjects).length === 0 && Object.entries(nxmCall.rtcObjects).length !== 0) {
                    Object.assign(conversation.media.rtcObjects, nxmCall.rtcObjects);
                }
                if (!conversation.media.pc && pc) {
                    Object.assign(conversation.media.pc = pc);
                }
                if (conversation.application.activeStreams.length === 0 && nxmCall.application.activeStreams.length > 0) {
                    conversation.application.activeStreams = nxmCall.application.activeStreams;
                }
                delete nxmCall.client_ref;
                delete nxmCall.knocking_id;
                // if rtcStats on call object place on media object as well
                if (nxmCall.rtcStats) {
                    conversation.media.rtcStats = nxmCall.rtcStats;
                }
                // remove the leg_id from the call_draft_list
                this.application._call_draft_list.delete(event.body.channel.id);
                this.application.calls.set(conversation.id, nxmCall);
                nxmCall._handleStatusChange(event);
                this.log.debug("_processMemberJoined: processedCall ", { nxmCall });
                if (conversation.members && event.body.member_id) {
                    const member = conversation.members.get(event.body.member_id);
                    if (member)
                        this.application.emit('member:call', member, nxmCall);
                }
                // Supports old way of listening for the media stream after the conversation is set up even though its already there
                setTimeout(() => rtc_helper_1.default.emitMediaStream(conversation.me, pc, nxmCall.stream), 50);
            }
            this.log.debug("_processMemberJoined: default member joined: ", { event });
            return event;
        }
        catch (e) {
            this.log.error("_processMemberJoined: ", { e });
        }
    }
    _processMemberInvited(conversation, event) {
        var _a, _b, _c, _d, _e, _f;
        try {
            if (!conversation) {
                this.log.warn(`no conversation object for ${event.type}`);
                return event;
            }
            // no need to process the event if it's not media related invite, or the member is us
            if ((((_a = conversation.me) === null || _a === void 0 ? void 0 : _a.user.id) === event.body.invited_by) || !((_c = (_b = event.body.user.media) === null || _b === void 0 ? void 0 : _b.audio_settings) === null || _c === void 0 ? void 0 : _c.enabled)) {
                return event;
            }
            const caller = utils_1.default.getMemberNumberFromEventOrNull(event.body.channel) ||
                utils_1.default.getMemberFromNameOrNull(conversation, event.body.invited_by) || 'unknown';
            const nxmCall = new nxmCall_1.default(this.application, conversation, caller);
            this.application.calls.set(conversation.id, nxmCall);
            if (((_d = event.body) === null || _d === void 0 ? void 0 : _d.sdp) && this.application.session.config.enableInboundOffer) {
                nxmCall._setOffer({ sdp: event.body.sdp, leg_id: event.body.channel.id });
            }
            // (VAPI call)
            if (!((_e = conversation.display_name) === null || _e === void 0 ? void 0 : _e.startsWith('CALL_'))) {
                nxmCall._handleStatusChange(event);
            }
            this.application.emit('member:call', this.application.conversations.get(event.cid).members.get((_f = event.body) === null || _f === void 0 ? void 0 : _f.member_id), nxmCall);
            return event;
        }
        catch (e) {
            this.log.error("_processMemberInvited: ", { e });
        }
    }
}
exports.default = ApplicationEventsHandler;
module.exports = ApplicationEventsHandler;
