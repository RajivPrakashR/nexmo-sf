'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Nexmo Client SDK
 *  Member Object Model
 *
 * Copyright (c) Nexmo Inc.
*/
const WildEmitter = require('wildemitter');
const nexmoClientError_1 = require("./nexmoClientError");
const nxmEvent_1 = __importDefault(require("./events/nxmEvent"));
const utils_1 = __importDefault(require("./utils"));
/**
 * An individual user (i.e. conversation member).
 * @class Member
 * @param {Conversation} conversation
 * @param {object} params
*/
class Member {
    constructor(conversation, params) {
        this.conversation = conversation;
        this.callStatus = null;
        this._normalise(params);
        WildEmitter.mixin(Member);
    }
    /**
     * Update object instance and align attribute names
     *
     * Handle params input to keep consistent the member object
     * @param {object} params member attributes
     * @private
    */
    _normalise(params) {
        if (params) {
            this.user = this.user || {};
            this.channel = params.channel || {
                type: 'app'
            };
            let key;
            for (key in params) {
                switch (key) {
                    case 'member_id':
                        this.id = params.member_id;
                        break;
                    case 'timestamp':
                        this.timestamp = params.timestamp;
                        break;
                    case 'state':
                        this.state = params.state;
                        break;
                    case 'from':
                        this.id = params.from; // special case for member events
                        break;
                    case 'user_id':
                        this.user.id = params.user_id;
                        break;
                    case 'name':
                        this.user.name = params.name;
                        break;
                    case 'user':
                        this.user = {
                            name: params.user.name,
                            id: params.user.user_id || params.user.id
                        };
                        this.display_name = this.display_name || params.user.display_name;
                        break;
                    case 'invited_by':
                        this.invited_by = params.invited_by;
                        break;
                    case 'display_name':
                        this.display_name = this.display_name || params.display_name;
                        break;
                    case '_embedded':
                        if (params._embedded.user) {
                            this.user = {
                                id: params._embedded.user.id || this.user.id,
                                name: params._embedded.user.name || this.user.name
                            };
                            this.display_name = this.display_name || params._embedded.user.display_name;
                        }
                    case 'conversation':
                        break;
                    default:
                        if (!params.type) {
                            this[key] = params[key];
                        }
                }
            }
            // join conversation returns our member with only id,
            // compare it for now and use the username we have in the application object
            if (this.conversation.application.me && params.user_id === this.conversation.application.me.id) {
                this.user.name = this.conversation.application.me.name;
            }
            // make sure we don't keep a member.user_id, name in any flow
            delete this.user_id;
            delete this.name;
            delete this.user.user_id;
        }
    }
    /**
     * Play the given stream only to this member within the conversation
     *
     * @param {string} [params]
     *
     * @returns {Promise<NXMEvent>}
     * @private
    */
    async playStream(params) {
        try {
            const response = await this.conversation.application.session.sendNetworkRequest({
                type: 'POST',
                path: `conversations/${this.id}/events`,
                data: {
                    type: 'audio:play',
                    to: this.id,
                    body: params
                }
            });
            return new nxmEvent_1.default(this.conversation, response);
        }
        catch (error) {
            throw new nexmoClientError_1.NexmoApiError(error);
        }
    }
    /**
     * Speak the given text only to this member within the Conversation.
     *
     * @param {string} [params]
     *
     * @returns {Promise<NXMEvent>}
     * @private
    */
    async sayText(params) {
        try {
            const response = await this.conversation.application.session.sendNetworkRequest({
                type: 'POST',
                path: `conversations/${this.id}/events`,
                data: {
                    type: 'audio:say',
                    cid: this.id,
                    from: this.conversation.me.id,
                    to: this.id,
                    body: {
                        text: params.text,
                        voice_name: params.voice_name || 'Amy',
                        level: params.level || 1,
                        queue: params.queue || true,
                        loop: params.loop || 1,
                        ssml: params.ssml || false
                    }
                }
            });
            return new nxmEvent_1.default(this.conversation, response);
        }
        catch (error) {
            throw new nexmoClientError_1.NexmoApiError(error);
        }
    }
    /**
     * Kick a Member from the Conversation.
     *
     * @param {object} [reason] the reason for kicking out a member
     * @param {string} [reason.reason_code] the code of the reason
     * @param {string} [reason.reason_text] the description of the reason
     * @example <caption>Remove a member from the Conversation.</caption>
     * // Remove a member
     * member.kick({reason_code: "Reason Code", reason_text: "Reason Text"})
     * .then(() => {
     *     console.log("Successfully removed member.");
     * }).catch((error) => {
     *     console.error("Error removing member: ", error);
     * });
     *
     * // Remove yourself
     * conversation.me.kick({reason_code: "Reason Code", reason_text: "Reason Text"})
     * .then(() => {
     *     console.log("Successfully removed yourself.");
     * }).catch((error) => {
     *     console.error("Error removing yourself: ", error);
     * });
     *
     * @returns {Promise}
    */
    async kick(reason) {
        var _a, _b, _c;
        let path = `conversations/${this.conversation.id}/members/${this.id}`;
        let params = new URLSearchParams();
        // add member_id of from
        if ((_c = (_b = (_a = this) === null || _a === void 0 ? void 0 : _a.conversation) === null || _b === void 0 ? void 0 : _b.me) === null || _c === void 0 ? void 0 : _c.id) {
            params.append('from', this.conversation.me.id);
        }
        if (reason) {
            Object.keys(reason).forEach((key) => {
                params.append(key, reason[key]);
            });
        }
        path += `?${params.toString()}`;
        try {
            return await this.conversation.application.session.sendNetworkRequest({
                type: 'DELETE',
                path
            });
        }
        catch (error) {
            throw new nexmoClientError_1.NexmoApiError(error);
        }
    }
    /**
     * Mute your stream.
     *
     * @param {boolean} [mute] true for mute, false for unmute
     * @param {number} [streamIndex] stream index of the stream
     * @example <caption>Mute audio stream of your Member.</caption>
     * // Mute yourself
     * conversation.me.mute(true);
     *
     * // Unmute yourself
     * conversation.me.mute(false);
     *
     * @returns {Promise}
    */
    mute(mute, streamIndex = null) {
        return this.conversation.media.mute(mute, streamIndex);
    }
    /**
     * Earmuff yourself in the Conversation.
     *
     * @param {boolean} earmuff true or false
     * @example <caption>Disables your Member from hearing other Members in the Conversation.</caption>
     * // Earmuff yourself
     * conversation.me.earmuff(true);
     *
     * // Unearmuff yourself
     * conversation.me.earmuff(false);
     *
     * @returns {Promise}
     *
    */
    earmuff(earmuff) {
        return this.conversation.media.earmuff(earmuff);
    }
    /**
     * Handle member object events
     *
     * Handle events that are modifying this member instance
     * @param {NXMEvent} event invited, joined, left, media events
     * @private
    */
    _handleEvent(event) {
        switch (event.type) {
            case 'member:invited':
                this._normalise(event.body); // take care of misaligned objects.
                this.state = 'INVITED';
                this.timestamp.invited = event.body.timestamp.invited;
                if (!event.body.invited_by && event.body.user.media && event.body.user.media.audio_settings
                    && event.body.user.media.audio_settings.enabled) {
                    this._setCallStatusAndEmit('started');
                }
                break;
            case 'member:joined':
                this._normalise(event.body); // take care of misaligned objects.
                this.state = 'JOINED';
                this.timestamp.joined = event.body.timestamp.joined;
                if (event.body.channel && event.body.channel.knocking_id) {
                    this._setCallStatusAndEmit('started');
                }
                break;
            case 'member:left':
                this._normalise(event.body); // take care of misaligned objects.
                this.state = 'LEFT';
                this.timestamp.left = event.body.timestamp.left;
                if (event.body.reason && event.body.reason.text) {
                    this._setCallStatusAndEmit(event.body.reason.text);
                }
                break;
            case 'member:media':
                this.media = event.body.media;
                break;
            case 'leg:status:update':
                this.channel.legs = utils_1.default.updateMemberLegs(this.channel.legs, event);
                this._setCallStatusAndEmit(event.body.status);
                break;
            case 'audio:ringing:start':
                if (!this.callStatus || this.callStatus === 'started') {
                    this._setCallStatusAndEmit('ringing');
                }
                break;
            default:
                break;
        }
    }
    /**
       * Set the member.callStatus and emit a member:call:status event
       *
       * @param {Member.callStatus} this.callStatus the call status to set
       * @private
      */
    _setCallStatusAndEmit(callStatus) {
        if (this.callStatus !== String(callStatus)) {
            this.callStatus = callStatus;
            this.conversation.emit('member:call:status', this);
        }
    }
}
exports.default = Member;
module.exports = Member;
