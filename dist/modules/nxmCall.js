'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Nexmo Client SDK
 *  NXMCall Object Model
 *
 * Copyright (c) Nexmo Inc.
*/
const WildEmitter = require('wildemitter');
const loglevel_1 = require("loglevel");
const nexmoClientError_1 = require("../nexmoClientError");
const rtc_helper_1 = __importDefault(require("./rtc_helper"));
/**
 * Conversation NXMCall Object.
 * @class NXMCall
 * @param {Application} application - The Application object.
 * @param {Conversation} conversation - The Conversation object that belongs to this nxmCall.
 * @param {Member} from - The member that initiated the nxmCall.
 * @property {Application} application -  The Application object that the nxmCall belongs to.
 * @property {Conversation} conversation -  The Conversation object that belongs to this nxmCall.
 * @property {Member} from - The caller. The member object of the caller (not a reference to the one in conversation.members)
 * @property {Map<string, Member>} to - The callees keyed by a member's id. The members that receive the nxmCall (not a reference to conversation.members)
 * @property {String} id - The nxmCall id (our member's leg_id, comes from rtc:answer event, or member:media)
 * @property {NXMCall.CALL_STATUS} CALL_STATUS="started" - the available nxmCall statuses
 * @property {NXMCall.CALL_DIRECTION} direction - the Direction of the nxmCall, Outbound, Inbound
 * @property {NXMCall.STATUS_PERMITTED_FLOW} STATUS_PERMITTED_FLOW - the permitted nxmCall status transition map, describes the "from" and allowed "to" transitions
 * @property {object[]} rtcObjects data related to the rtc connection
 * @property {string} rtcObjects.rtc_id the rtc_id
 * @property {PeerConnection} rtcObjects.pc the current PeerConnection object
 * @property {Stream} rtcObjects.stream the stream of the specific rtc_id
 * @property {string} [rtcObjects.type] audio the type of the stream
 * @property {number} rtcObjects.streamIndex the index number of the stream (e.g. use to mute)
 * @property {Stream} stream the remote stream
 * @emits Application#member:call
 * @emits Application#call:status:changed
*/
/**
 * Application listening for member call events.
 *
 * @event Application#member:call
 *
 * @property {Member} member - the member that initiated the nxmCall
 * @property {NXMCall} nxmCall -  resolves the nxmCall object
 *
 * @example <caption>listen for member call events on Application level</caption>
 *  application.on("member:call", (member, nxmCall) => {
 *    console.log("NXMCall ", nxmCall);
 *  });
*/
/**
 * Application listening for nxmCall status changed events.
 *
 * @event Application#call:status:changed
 * @property {NXMCall} nxmCall -  the actual event
 * @example <caption>listen for nxmCall status changed events on Application level</caption>
 *  application.on("call:status:changed",(nxmCall) => {
 *    console.log("call: " + nxmCall.status);
 *  });
*/
class NXMCall {
    constructor(application, conversation, from) {
        this.application = application;
        this.log = loglevel_1.getLogger(this.constructor.name);
        this.from = from;
        this.conversation = null;
        this.rtcObjects = {};
        /**
         * Enum for NXMCall status.
         * @readonly
         * @enum {string}
         * @alias NXMCall.CALL_STATUS
        */
        this.CALL_STATUS = {
            /** The NXMCall is in started status */
            STARTED: 'started',
            /** The NXMCall is in ringing status */
            RINGING: 'ringing',
            /** The NXMCall is in answered status */
            ANSWERED: 'answered',
            /** The NXMCall is in completed status */
            COMPLETED: 'completed',
            /** The NXMCall is in busy status */
            BUSY: 'busy',
            /** The NXMCall is in timeout status */
            TIMEOUT: 'timeout',
            /** The NXMCall is in unanswered status */
            UNANSWERED: 'unanswered',
            /** The NXMCall is in rejected status */
            REJECTED: 'rejected',
            /** The NXMCall is in failed status */
            FAILED: 'failed'
        };
        /**
         * Enum for NXMCall direction.
         * @readonly
         * @enum {string}
         * @alias NXMCall.CALL_DIRECTION
        */
        this.CALL_DIRECTION = {
            /** The NXMCall started from another end */
            INBOUND: 'inbound',
            /** The NXMCall started from this client */
            OUTBOUND: 'outbound'
        };
        Object.freeze(this.CALL_DIRECTION);
        /**
         * Enum for the permitted call status transition.
         * @readonly
         * @alias NXMCall.STATUS_PERMITTED_FLOW
         * @enum {Map<string, Set<NXMCall.CALL_STATUS>>}
        */
        this.STATUS_PERMITTED_FLOW = new Map([
            /** Permitted transition array from STARTED  */
            ['STARTED', new Set([
                    this.CALL_STATUS.RINGING,
                    this.CALL_STATUS.ANSWERED,
                    this.CALL_STATUS.FAILED,
                    this.CALL_STATUS.TIMEOUT,
                    this.CALL_STATUS.UNANSWERED,
                    this.CALL_STATUS.REJECTED,
                    this.CALL_STATUS.BUSY
                ])],
            /** Permitted transition array from RINGING  */
            ['RINGING', new Set([
                    this.CALL_STATUS.ANSWERED,
                    this.CALL_STATUS.FAILED,
                    this.CALL_STATUS.TIMEOUT,
                    this.CALL_STATUS.UNANSWERED,
                    this.CALL_STATUS.REJECTED,
                    this.CALL_STATUS.BUSY
                ])],
            /** Permitted transition set from ANSWERED  */
            ['ANSWERED', new Set([
                    this.CALL_STATUS.COMPLETED,
                    this.CALL_STATUS.FAILED
                ])]
        ]);
        Object.freeze(this.STATUS_PERMITTED_FLOW);
        this.status = null;
        this.call_disconnect_timeout = null;
        this.direction = this.CALL_DIRECTION.INBOUND;
        this._setupConversationObject(conversation);
        WildEmitter.mixin(NXMCall);
    }
    /**
     * Enable NXMCall stats to be emitted in
   * - application.inAppCall.on('rtcstats:report')
   * - application.inAppCall.on('rtcstats:analytics')
     * @private
    */
    _enableStatsEvents() {
        this.conversation.media._enableStatsEvents();
    }
    /**
     * Attach member event listeners from the conversation
     * @private
    */
    _attachCallListeners() {
        // Conversation level listeners
        this.log.debug("_attachCallListeners : ", { nxmCall: this });
        try {
            this.conversation.releaseGroup('call_module');
            this.conversation.on('member:media', 'call_module', (from, event) => {
                if (this.application.calls && this.application.calls.has(this.conversation.id)) {
                    this.application.calls.get(this.conversation.id)._handleStatusChange(event);
                }
            });
        }
        catch (e) {
            this.log.error("_attachCallListeners_error: ", { e });
        }
    }
    /**
     * Validate the current nxmCall status transition
     * If a transition is not defined, return false
     * @param {string} status the status to validate
     * @returns {boolean} false if the transition is not permitted
     * @private
    */
    _isValidStatusTransition(status) {
        if (!status) {
            throw new nexmoClientError_1.NexmoClientError(`Provide the status to validate the transition from '${this.status}'`);
        }
        // if the nxmCall object is just initialised allow any state
        if (!this.status) {
            return true;
        }
        const current_status = this.status.toUpperCase();
        if (!this.STATUS_PERMITTED_FLOW.has(current_status)) {
            return false;
        }
        if (this.status === status) {
            return false;
        }
        return (this.STATUS_PERMITTED_FLOW.get(current_status).has(status));
    }
    /**
     * Go through the members of the conversation and if .me is the only one (JOINED or INVITED)
     * nxmCall nxmCall.hangUp().
     * @returns {Promise} - empty promise or the nxmCall.hangUp promise chain
    */
    hangUpIfAllLeft() {
        this.log.debug("hangUpIfAllLeft: ", { nxmCall: this });
        if (!this.conversation.me || this.conversation.me.state === 'LEFT' || this.conversation.members.size <= 1) {
            return Promise.resolve();
        }
        for (let member of this.conversation.members.values()) {
            if (member.state !== 'LEFT' && (this.conversation.me.user.id !== member.user.id)) {
                return Promise.resolve();
            }
        }
        return this.hangUp();
    }
    /**
     * Set the conversation object of the NXMCall
     * update nxmCall.from, and nxmCall.to attributes based on the conversation members
     * @private
    */
    _setupConversationObject(conversation, rtc_id) {
        if (!conversation)
            return;
        this.conversation = conversation;
        if (!conversation.me) {
            this.log.warn('missing own member object');
        }
        else {
            this.to = new Map(conversation.members);
            if (this.from) {
                this.to.delete(this.from.id);
            }
        }
        // Attch Conversation Listeners
        this._attachCallListeners();
    }
    /**
     * Set the from object of the NXMCall
     * @private
    */
    _setFrom(from) {
        this.from = from;
    }
    /**
     * Set the from object of the NXMCall
     * @private
    */
    _setOffer(offer) {
        this.offer = offer;
    }
    /**
     * Process raw events to figure out the nxmCall status
     * @private
    */
    _handleStatusChange(event) {
        var _a;
        // for knocking case the conversation object is not yet set in the nxmCall. We know the action is initiated from us
        const _isEventFromMe = (this.conversation) ? ((_a = this.conversation.me) === null || _a === void 0 ? void 0 : _a.id) === event.from : true;
        const _isOutbound = this.direction === this.CALL_DIRECTION.OUTBOUND;
        this.log.debug("_handleStatusChange: ", { event }, `_isEventFromMe: ${_isEventFromMe} _isOutbound: ${_isOutbound}`);
        let _handleStatusChangeMap = new Map();
        _handleStatusChangeMap.set('member:joined', async () => {
            if (event.body.channel && event.body.channel.id) {
                try {
                    this._setStatusAndEmit(this.CALL_STATUS.STARTED);
                    return;
                }
                catch (error) {
                    this._setStatusAndEmit(this.CALL_STATUS.FAILED);
                    this.log.error(error);
                    throw error;
                }
            }
            return Promise.resolve();
        });
        _handleStatusChangeMap.set('member:invited', () => {
            if (event.body.invited_by === null &&
                event.body.user.media &&
                event.body.user.media.audio_settings) {
                this._setStatusAndEmit(this.CALL_STATUS.STARTED);
            }
            return Promise.resolve();
        });
        _handleStatusChangeMap.set('rtc:hangup', () => {
            if (this.status === this.CALL_STATUS.ANSWERED) {
                this._setStatusAndEmit(this.CALL_STATUS.COMPLETED);
                return Promise.resolve();
            }
            else {
                if (_isEventFromMe && _isOutbound || !_isEventFromMe && !_isOutbound) {
                    this._setStatusAndEmit(this.CALL_STATUS.UNANSWERED);
                    return Promise.resolve();
                }
                else {
                    this._setStatusAndEmit(this.CALL_STATUS.REJECTED);
                    return Promise.resolve();
                }
            }
        });
        _handleStatusChangeMap.set('member:left', () => {
            if (!event.body.timestamp.hasOwnProperty('joined') && this.status !== this.CALL_STATUS.ANSWERED) {
                if (_isEventFromMe && _isOutbound || !_isEventFromMe && !_isOutbound) {
                    this._setStatusAndEmit(this.CALL_STATUS.UNANSWERED);
                    return Promise.resolve();
                }
                else {
                    this._setStatusAndEmit(this.CALL_STATUS.REJECTED);
                    return Promise.resolve();
                }
            }
        });
        _handleStatusChangeMap.set('member:media', () => {
            if (this.status !== this.CALL_STATUS.ANSWERED && event.body.audio) {
                if (_isEventFromMe && event.body.channel) {
                    this.id = event.body.channel.id;
                }
                if ((!_isEventFromMe || !_isOutbound) && this.id) {
                    this._setStatusAndEmit(this.CALL_STATUS.ANSWERED);
                }
            }
            return Promise.resolve();
        });
        _handleStatusChangeMap.set('sip:ringing', () => {
            if (this.status !== this.CALL_STATUS.RINGING) {
                this._setStatusAndEmit(this.CALL_STATUS.RINGING);
            }
            return Promise.resolve();
        });
        _handleStatusChangeMap.set('sip:hangup', () => {
            switch (event.body.reason.sip_code) {
                case 486:
                    this._setStatusAndEmit(this.CALL_STATUS.BUSY);
                    break;
                case 487:
                    this._setStatusAndEmit(this.CALL_STATUS.TIMEOUT);
                    break;
                case 403:
                    this._setStatusAndEmit(this.CALL_STATUS.FAILED);
                    break;
            }
            return Promise.resolve();
        });
        _handleStatusChangeMap.set('knocking:delete:success', () => {
            this._setStatusAndEmit(this.CALL_STATUS.UNANSWERED);
            return Promise.resolve();
        });
        if (_handleStatusChangeMap.has(event.type)) {
            return _handleStatusChangeMap.get(event.type).call(this);
        }
    }
    /**
     * Set the nxmCall.status and emit a call:status:changed event
     *
     * @param {NXMCall.CALL_STATUS} this.CALL_STATUS the canxmCallll status to set
     * @emits Application#call:status:changed
     * @private
    */
    _setStatusAndEmit(status) {
        if (!this._isValidStatusTransition(status)) {
            return;
        }
        this.status = status;
        this.log.debug(`_setStatusAndEmit: ${status}`, { nxmCall: this });
        this.application.emit('call:status:changed', this);
    }
    /**
     * Answers an incoming nxmCall
     * Join the conversation that you are invited
     * Create autoplay Audio object
     *
   * @param {boolean} [autoPlayAudio=true] attach the audio stream automatically to start playing (default true)
     * @returns {Promise<Audio>}
    */
    async answer(autoPlayAudio = true) {
        this.log.debug(`answer: { autoPlayAudio: ${autoPlayAudio}`);
        if (this.conversation) {
            try {
                await this.conversation.join();
                const stream = await this.conversation.media.enable({ autoPlayAudio, offer: this.offer });
                this.offer = undefined;
                return stream;
            }
            catch (error) {
                this._setStatusAndEmit(this.CALL_STATUS.FAILED);
                this.log.error(error);
                throw error;
            }
        }
        else {
            throw new nexmoClientError_1.NexmoClientError('error:call:answer');
        }
    }
    /**
     * Trigger the nxmCall flow for the input users.
     * Create a conversation with prefix name "CALL_"
     * and invite all the users.
     * If at least one user is successfully invited, enable the audio.
     *
     * @param {string[]} usernames the usernames of the users to call
   * @param {boolean} [autoPlayAudio=true] attach the audio stream automatically to start playing (default true)
     * @returns {Promise[]} an array of the invite promises for the provided usernames
     * @private
    */
    async createCall(usernames, autoPlayAudio = true) {
        this.log.debug(`createCall: { usernames: ${usernames}, autoPlayAudio: ${autoPlayAudio} }`);
        if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
            return Promise.reject(new nexmoClientError_1.NexmoClientError('error:application:call:params'));
        }
        try {
            const conversation = await this.application.newConversationAndJoin({ display_name: 'CALL_' + this.application.me.name + '_' + usernames.join('_').replace(' ', '') });
            conversation.members.set(conversation.me.id, conversation.me);
            this.from = conversation.me;
            this.successful_invited_members = new Map();
            const invites = usernames.map(async (username) => {
                // check all invites, if at least one is resolved enable audio
                // we need to catch rejections to allow all the chain to go through (all invites)
                // we then catch-reject a promise so that the errors are passing through the end of the chain
                try {
                    const member = await conversation.inviteWithAudio({ user_name: username });
                    conversation.members.set(member.id, member);
                    this.successful_invited_members.set(member.id, member);
                    return member;
                }
                catch (error) {
                    this.log.error(error);
                    // resolve the error to allow the promise.all to collect
                    // and return all the promises
                    return error;
                }
            });
            // helper function to process in Promise.all() the failed invites too
            const process_invites = async () => {
                if (this.successful_invited_members.size > 0) {
                    await conversation.media.enable({
                        audio: {
                            muted: false,
                            earmuffed: false
                        },
                        autoPlayAudio
                    });
                    this.application.calls.set(conversation.id, this);
                    return invites;
                }
                else {
                    throw invites;
                }
            };
            // we need to continue the invites even if one fails,
            // in process_invites we do the check if at least one was successful
            await Promise.all(invites);
            this._setupConversationObject(conversation);
            return await process_invites();
        }
        catch (error) {
            this.log.error(error);
            this._setStatusAndEmit(this.CALL_STATUS.FAILED);
            throw error;
        }
    }
    /**
     * Trigger the nxmCall flow for the phone call.
     * Create a knocking event
     *
     * @param {string} user the phone number or the username to call
   * @param {string} type the type of the call you want to have. possible values "phone" or "app" (default is "phone")
     * @returns {Promise}
     * @private
    */
    async createServerCall(user, type, custom_data) {
        this.log.debug(`createServerCall: { user: ${user}, type: ${type}, custom_data: `, { custom_data });
        const to = {
            type
        };
        if (type === 'phone') {
            to.number = user;
        }
        else {
            to.user = user;
        }
        try {
            // PrewarmLeg
            const { stream, legId, rtcObjects } = await rtc_helper_1.default.prewarmLeg(this);
            this.log.debug("createServerCall: ", { stream }, { legId }, { rtcObjects });
            // Add Media to the Call Object
            this.rtcObjects = rtcObjects;
            this.stream = stream;
            this.id = legId;
            // Add leg_id to the call draft list
            this.application._call_draft_list.set(legId, this);
            rtc_helper_1.default.playAudioStream(stream);
            const params = {
                type: 'POST',
                path: 'knocking',
                data: {
                    channel: {
                        type: 'app',
                        from: { type: 'app' },
                        to,
                        id: legId || null
                    },
                    ...(custom_data && Object.keys(custom_data).length && { properties: { custom_data } })
                }
            };
            try {
                const knockingResponse = await this.application.session.sendNetworkRequest(params);
                this.knocking_id = knockingResponse.id;
            }
            catch (error) {
                throw new nexmoClientError_1.NexmoApiError(error);
            }
            // If knocking request doesn't result in member:joined after set time disable audio, cleanup media
            rtc_helper_1.default.cleanCallMediaIfFailed(this);
            return stream;
        }
        catch (error) {
            // If knocking request fails disable audio, cleanup media
            rtc_helper_1.default.cleanMediaProperties(this);
            throw error;
        }
    }
    /**
     * Hangs up the nxmCall
     *
     * If there is a knocking active, do a knocking:delete
     * otherwise
     * Leave from the conversation
     * Disable the audio
     *
   * @param {object} [reason] the reason for hanging up the nxmCall
   * @param {string} [reason.reason_code] the code of the reason
   * @param {string} [reason.reason_text] the description of the reason
     * @returns {Promise}
    */
    async hangUp(reason) {
        this.log.debug(`hangUp: { reason: ${reason} }`);
        if (this.conversation) {
            await this.conversation.media.disable();
        }
        if (!this.knocking_id && this.conversation) {
            return this.conversation.leave(reason).catch(error => {
                if (error.type !== "conversation:error:invalid-member-state") {
                    return Promise.reject(error);
                }
            });
        }
        else {
            let path = `knocking/${this.knocking_id}`;
            if (reason) {
                let params = new URLSearchParams();
                Object.keys(reason).forEach((key) => {
                    params.append(key, reason[key]);
                });
                path += `?${params.toString()}`;
            }
            try {
                const response = await this.application.session.sendNetworkRequest({
                    type: 'DELETE',
                    path
                });
                const nxmCall = this.application._call_draft_list.get(this.client_ref);
                nxmCall._handleStatusChange(response);
                this.application._call_draft_list.delete(this.client_ref);
                return response;
            }
            catch (error) {
                // Don't switch yet to fail status, it could be an expected race between knocking:delete and conversation.leave
                if (!this.conversation) {
                    this.log.debug('hangup: Problem cancelling the call. Knocking cancel failed and Conversation. Leave not available', error);
                    return;
                }
                else {
                    this.log.error(new nexmoClientError_1.NexmoApiError(error));
                    return this.conversation.leave(reason);
                }
            }
        }
    }
    /**
     * Rejects an incoming nxmCall
     * Leave from the conversation that you are invited
     *
   * @param {object} [reason] the reason for rejecting the nxmCall
   * @param {string} [reason.reason_code] the code of the reason
   * @param {string} [reason.reason_text] the description of the reason
     * @returns {Promise}
    */
    reject(reason) {
        this.log.debug(`reject: { reason: ${reason} }`);
        if (this.conversation) {
            return this.conversation.leave(reason);
        }
        else {
            return Promise.reject(new nexmoClientError_1.NexmoClientError('error:call:reject'));
        }
    }
}
exports.default = NXMCall;
module.exports = NXMCall;
