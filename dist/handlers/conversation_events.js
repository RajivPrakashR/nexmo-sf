'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Nexmo Client SDK
 *  Conversation Events Handler
 *
 * Copyright (c) Nexmo Inc.
 */
const loglevel_1 = require("loglevel");
const nxmEvent_1 = __importDefault(require("../events/nxmEvent"));
const text_event_1 = __importDefault(require("../events/text_event"));
const image_event_1 = __importDefault(require("../events/image_event"));
const message_event_1 = __importDefault(require("../events/message_event"));
/**
 * Handle Conversation Events
 *
 * @class ConversationEventsHandler
 * @param {Application} application
 * @param {Conversation} conversation
 * @private
*/
class ConversationEventHandler {
    constructor(application, conversation) {
        this.log = loglevel_1.getLogger(this.constructor.name);
        this.application = application;
        this.conversation = conversation;
        this.constructed_event = null;
        this._handleEventMap = {
            'event:delete': this._processDelete,
            'image': this._processImage,
            'image:delivered': this._processDelivered,
            'image:seen': this._processSeen,
            'member:invited': this._processMember,
            'member:joined': this._processMember,
            'member:left': this._processMember,
            'audio:ringing:start': this._processMember,
            'leg:status:update': this._processLegStatus,
            'member:media': this._processMedia,
            'text': this._processText,
            'text:delivered': this._processDelivered,
            'text:seen': this._processSeen,
            'audio:mute:on': this._processMuteForMedia,
            'audio:mute:off': this._processMuteForMedia,
            'message': this._processMessage,
            'message:delivered': this._processDelivered,
            'message:seen': this._processSeen,
            'message:submitted': this._processSubmitted,
            'message:rejected': this._processRejected,
            'message:undeliverable': this._processUndeliverable
        };
    }
    /**
      * Handle and event.
      *
      * Identify the type of the event,
      * create the corresponding Class instance
      * emit to the corresponding Objects
      * @param {object} event
      * @private
    */
    handleEvent(event) {
        if (this._handleEventMap.hasOwnProperty(event.type)) {
            return this._handleEventMap[event.type].call(this, event) || new nxmEvent_1.default(this.conversation, event);
        }
        return new nxmEvent_1.default(this.conversation, event);
    }
    /**
      * Mark the requested event as delivered
      * use that event as constructed to update the local events' map
        * @param {object} event
      * @returns the NXMEvent that is marked as delivered
      * @private
    */
    _processDelivered(event) {
        let event_to_mark = this.conversation.events.get(event.body.event_id);
        if (event_to_mark) {
            event_to_mark.state = event_to_mark.state || {};
            event_to_mark.state.delivered_to = event_to_mark.state.delivered_to || {};
            event_to_mark.state.delivered_to[event.from] = event.timestamp;
            return event_to_mark;
        }
        else {
            this.log.warn('NXMEvent not found');
            return null;
        }
    }
    /**
      * Delete the requested event
      * empty the payload of the event (text, image or message)
      * use that event as constructed to update the local events map
      * @param {object} event
      * @returns the deleted events
      * @private
    */
    _processDelete(event) {
        var _a, _b;
        let event_to_delete = this.conversation.events.get((_b = (_a = event) === null || _a === void 0 ? void 0 : _a.body) === null || _b === void 0 ? void 0 : _b.event_id);
        if (event_to_delete) {
            if (event_to_delete.body.text)
                event_to_delete.body.text = '';
            if (event_to_delete.body.representations)
                event_to_delete.body.representations = '';
            event_to_delete.body.timestamp = {
                deleted: event.timestamp
            };
            return event_to_delete;
        }
        else {
            this.log.warn('NXMEvent not found');
            return null;
        }
    }
    /**
      * Return an ImageEvent with the corresponding image data
      * @param {object} event
      * @returns {ImageEvent}
    */
    _processImage(event) {
        var _a;
        const imageEvent = new image_event_1.default(this.conversation, event);
        // Automatically send a delivery
        // avoid sending delivered to our own events
        if (((_a = this.conversation.me) === null || _a === void 0 ? void 0 : _a.id) !== imageEvent.from) {
            imageEvent.delivered();
        }
        return imageEvent;
    }
    /**
      * Handle events for member state changes (joined, invited, left)
      * in conversation level.
      * Other members are going through here too.
      * For .me member initial event (join, invite) use the application listener
        * @param {object} event
      * @returns {NXMEvent}
      * @private
    */
    _processMember(event) {
        // needs to first process the call state and then alter the member
        if (this.application.calls.has(this.conversation.id)) {
            let call = this.application.calls.get(this.conversation.id);
            call._handleStatusChange(event);
        }
        if (this.conversation.members.has(event.from))
            this.conversation.members.get(event.from)._handleEvent(event);
        return new nxmEvent_1.default(this.conversation, event);
    }
    /**
     * Handle events for leg status updates in conversation level.
     * Other member's legs are going through here too.
     * @param {object} event
     * @returns {NXMEvent}
     * @private
    */
    _processLegStatus(event) {
        if (this.conversation.members.has(event.from))
            this.conversation.members.get(event.from)._handleEvent(event);
        return new nxmEvent_1.default(this.conversation, event);
    }
    /**
      * Handle member:media events
      * use a call object if and the member object
        * @param {object} event
      * @private
    */
    _processMedia(event) {
        if (this.conversation.members.has(event.from))
            this.conversation.members.get(event.from)._handleEvent(event);
        return null;
    }
    /**
      * Handle *:mute:* events
        * @param {object} event
      * @private
    */
    _processMuteForMedia(event) {
        if (this.conversation.media.rtcObjects[event.body.rtc_id]) {
            event.streamIndex = this.conversation.media.rtcObjects[event.body.rtc_id].streamIndex;
        }
        else {
            this.log.warn('No audio stream was found');
        }
        return null;
    }
    /**
      * Mark the requested event as seen
      * use that event as constructed to update the local Events map
        * @param {object} event
      * @private
    */
    _processSeen(event) {
        let event_to_mark = this.conversation.events.get(event.body.event_id);
        if (event_to_mark) {
            event_to_mark.state = event_to_mark.state || {};
            event_to_mark.state.seen_by = event_to_mark.state.seen_by || {};
            event_to_mark.state.seen_by[event.from] = event.timestamp;
            return event_to_mark;
        }
        else {
            this.log.warn('NXMEvent not found');
            return null;
        }
    }
    /**
      * Create the TextEvent object and trigger .delivered()
        * @param {object} event
      * @private
    */
    _processText(event) {
        var _a, _b;
        const textEvent = new text_event_1.default(this.conversation, event);
        // Automatically send a delivery
        // avoid sending delivered to our own events
        if (((_b = (_a = this.conversation) === null || _a === void 0 ? void 0 : _a.me) === null || _b === void 0 ? void 0 : _b.id) !== textEvent.from) {
            textEvent.delivered();
        }
        return textEvent;
    }
    /**
      * Create the MessageEvent object and trigger .delivered()
        * @param {object} event
      * @private
    */
    _processMessage(event) {
        var _a, _b;
        const messageEvent = new message_event_1.default(this.conversation, event);
        // Automatically send a delivery
        // avoid sending delivered to our own events
        if (((_b = (_a = this.conversation) === null || _a === void 0 ? void 0 : _a.me) === null || _b === void 0 ? void 0 : _b.id) !== messageEvent.from) {
            messageEvent.delivered();
        }
        return messageEvent;
    }
    /**
      * Mark the requested event as submitted
      * use that event as constructed to update the local Events map
        * @param {object} event
      * @private
    */
    _processSubmitted(event) {
        let event_to_mark = this.conversation.events.get(event.body.event_id);
        if (event_to_mark) {
            event_to_mark.state = event_to_mark.state || {};
            event_to_mark.state.submitted_to = event_to_mark.state.submitted_to || {};
            event_to_mark.state.submitted_to[event.from] = event.timestamp;
            return event_to_mark;
        }
        else {
            this.log.warn('NXMEvent not found');
            return null;
        }
    }
    /**
      * Mark the requested event as rejected
      * use that event as constructed to update the local Events map
        * @param {object} event
      * @private
    */
    _processRejected(event) {
        let event_to_mark = this.conversation.events.get(event.body.event_id);
        if (event_to_mark) {
            event_to_mark.state = event_to_mark.state || {};
            event_to_mark.state.rejected_by = event_to_mark.state.rejected_by || {};
            event_to_mark.state.rejected_by[event.from] = event.timestamp;
            return event_to_mark;
        }
        else {
            this.log.warn('NXMEvent not found');
            return null;
        }
    }
    /**
      * Mark the requested event as undeliverable
      * use that event as constructed to update the local Events map
        * @param {object} event
      * @private
    */
    _processUndeliverable(event) {
        let event_to_mark = this.conversation.events.get(event.body.event_id);
        if (event_to_mark) {
            event_to_mark.state = event_to_mark.state || {};
            event_to_mark.state.undeliverable_to = event_to_mark.state.undeliverable_to || {};
            event_to_mark.state.undeliverable_to[event.from] = event.timestamp;
            return event_to_mark;
        }
        else {
            this.log.warn('NXMEvent not found');
            return null;
        }
    }
}
exports.default = ConversationEventHandler;
module.exports = ConversationEventHandler;
