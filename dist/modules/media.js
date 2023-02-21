"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Nexmo Client SDK
 *  Media Object Model
 *
 * Copyright (c) Nexmo Inc.
 */
const loglevel_1 = require("loglevel");
const nexmoClientError_1 = require("../nexmoClientError");
const rtc_helper_1 = __importDefault(require("./rtc_helper"));
const utils_1 = __importDefault(require("../utils"));
const nxmEvent_1 = __importDefault(require("../events/nxmEvent"));
const conversation_1 = __importDefault(require("../conversation"));
const application_1 = __importDefault(require("../application"));
/**
 * Member listening for audio stream on.
 *
 * @event Member#media:stream:on
 *
 * @property {number} payload.streamIndex the index number of this stream
 * @property {number} [payload.rtc_id] the rtc_id / leg_id
 * @property {string} [payload.remote_member_id] the id of the Member the stream belongs to
 * @property {string} [payload.name] the stream's display name
 * @property {MediaStream} payload.stream the stream that is activated
 * @property {boolean} [payload.audio_mute] if the audio is muted
 */
/**
 * WebRTC Media class
 * @class Media
 * @property {Application} application The parent application object
 * @property {Conversation} parentConversation the conversation object this media instance belongs to
 * @property {number} parentConversation.streamIndex the latest index of the streams, updated in each new peer offer
 * @property {object[]} rtcObjects data related to the rtc connection
 * @property {string} rtcObjects.rtc_id the rtc_id
 * @property {PeerConnection} rtcObjects.pc the current PeerConnection object
 * @property {Stream} rtcObjects.stream the stream of the specific rtc_id
 * @property {string} [rtcObjects.type] audio the type of the stream
 * @property {number} rtcObjects.streamIndex the index number of the stream (e.g. use to mute)
 * @property {RTCStatsConfig} rtcstats_conf the config needed to controll rtcstats analytics behavior
 * @property {RTCStatsAnalytics} rtcstats an instance to collect analytics from a peer connection
 * @emits Application#rtcstats:report
 * @emits Application#rtcstats:analytics
 * @emits Member#media:stream:on
 */
class Media {
    constructor(conversationOrApplication) {
        var _a, _b, _c;
        const conversation = conversationOrApplication instanceof conversation_1.default
            ? conversationOrApplication
            : null;
        const application = conversationOrApplication instanceof application_1.default
            ? conversationOrApplication
            : null;
        this.log = loglevel_1.getLogger(this.constructor.name);
        if (conversation) {
            this.rtcHelper = new rtc_helper_1.default();
            this.application = conversation.application;
            this.application.activeStreams = this.application.activeStreams || [];
            this.parentConversation = conversation;
            this.rtcObjects = {};
            this.streamIndex = 0;
            this.rtcstats_conf = ((_c = (_b = (_a = this.application) === null || _a === void 0 ? void 0 : _a.session) === null || _b === void 0 ? void 0 : _b.config) === null || _c === void 0 ? void 0 : _c.rtcStats) || {};
            this.rtcStats = null;
        }
        else if (application) {
            this.rtcHelper = new rtc_helper_1.default();
            this.application = application;
        }
        else {
            this.log.warn("No conversation object in Media");
        }
    }
    _attachEndingEventHandlers() {
        if (!this.parentConversation) {
            return;
        }
        this.log.debug("attaching leave listeners in media for " + this.parentConversation.id);
        this.parentConversation.on("rtc:hangup", async (event) => {
            let member;
            if (this.parentConversation.members.has(event.from)) {
                member = this.parentConversation.members.get(event.from);
            }
            else {
                try {
                    member = await this.parentConversation.getMember(event.from);
                }
                catch (error) {
                    this.log.warn(`There is an error getting the member ${error}`);
                }
            }
            if (member.user.id === this.application.me.id &&
                this.application.activeStreams.length) {
                this._cleanMediaProperties();
            }
            // terminate peer connection stream in case of a transfer
            if (member.user.id === this.application.me.id &&
                member.transferred_from) {
                member.transferred_from.media._cleanMediaProperties();
            }
            if (member.user.id === this.application.me.id) {
                this.parentConversation.off("rtc:hangup");
            }
        });
    }
    /**
     * Switch on the rtc stats emit events
     * @private
     */
    _enableStatsEvents() {
        this.rtcstats_conf.emit_rtc_analytics = true;
        this.rtcstats_conf.remote_collection = true;
        const rtcObject = this._findRtcObjectByType("audio");
        if (!this.rtcStats && rtcObject) {
            this.log.debug(`enabling stats events for ${rtcObject.rtc_id}`);
            this.rtcStats = rtc_helper_1.default._initStatsEvents({
                application: this.application,
                rtc_id: rtcObject.rtc_id,
                pc: this.pc,
                conversation: this.parentConversation,
            });
        }
    }
    /**
     * Switch off the rtcStat events
     * @private
     */
    _disableStatsEvents() {
        this.rtcstats_conf.emit_events = false;
        this.rtcstats_conf.emit_rtc_analytics = false;
        this.rtcstats_conf.remote_collection = false;
        this.rtcStats.removeIntervals();
        delete this.rtcStats;
    }
    /**
     * Function used to init the media stream
     * @private
     */
    _audioInitHandler(params = {}, onIceCandidateHandler) {
        return new Promise(async (resolve, reject) => {
            const streamIndex = this.streamIndex;
            this.streamIndex++;
            const { audioConstraints } = params;
            try {
                const localStream = await rtc_helper_1.default.getUserAudio(audioConstraints);
                const pc = rtc_helper_1.default.createPeerConnection(this.application);
                this.pc = pc;
                const { application, log, parentConversation: conversation, rtcObjects } = this;
                const context = {
                    pc,
                    streamIndex,
                    localStream,
                    application,
                    conversation,
                    log,
                    rtcObjects
                };
                onIceCandidateHandler({ ...context, resolve, reject });
                rtc_helper_1.default.attachConversationEventHandlers(context);
                this._attachEndingEventHandlers();
            }
            catch (error) {
                reject(new nexmoClientError_1.NexmoClientError(error));
            }
        });
    }
    /**
     * Handles the enabling of audio when an offer is available
     * @private
     */
    _execAnswer(params = {}) {
        const { offer: { sdp, leg_id } } = params;
        return this._audioInitHandler(params, (context) => rtc_helper_1.default.doAnswer(context, sdp, leg_id));
    }
    /**
     * Handles the enabling of audio only stream with rtc:new
     * @private
     */
    _handleAudio(params = {}) {
        const { reconnectRtcId } = params;
        return this._audioInitHandler(params, (context) => rtc_helper_1.default.attachPeerConnectionEventHandlers({ ...context, reconnectRtcId }));
    }
    _findRtcObjectByType(type) {
        return Object.values(this.rtcObjects).find((rtcObject) => rtcObject.type === type);
    }
    async _cleanConversationProperties() {
        if (this.pc) {
            this.pc.close();
        }
        // stop active stream
        delete this.pc;
        this.rtcStats = null;
        this.application.activeStreams = [];
        this.listeningToRtcEvent = false;
        await Promise.resolve();
    }
    /**
     * Cleans up the user's media before leaving the conversation
     * @private
     */
    _cleanMediaProperties() {
        if (this.pc) {
            this.pc.close();
        }
        if (this.rtcObjects) {
            for (const leg_id in this.rtcObjects) {
                rtc_helper_1.default.closeStream(this.rtcObjects[leg_id].stream);
            }
        }
        delete this.pc;
        this.rtcStats = null;
        this.application.activeStreams = [];
        this.rtcObjects = {};
        this.listeningToRtcEvent = false;
    }
    async _disableLeg(leg_id) {
        const csRequestPromise = new Promise(async (resolve, reject) => {
            try {
                await this.application.session.sendNetworkRequest({
                    type: "DELETE",
                    path: `conversations/${this.parentConversation.id}/rtc/${leg_id}?from=${this.parentConversation.me.id}&originating_session=${this.application.session.session_id}`,
                    version: "beta2",
                });
                resolve("rtc:terminate:success");
            }
            catch (error) {
                reject(new nexmoClientError_1.NexmoApiError(error));
            }
        });
        const closeResourcesPromise = new Promise((resolve) => {
            if (this.rtcObjects[leg_id].pc) {
                this.rtcObjects[leg_id].pc.close();
            }
            if (this.rtcObjects[leg_id].stream) {
                rtc_helper_1.default.closeStream(this.rtcObjects[leg_id].stream);
            }
            resolve();
        });
        try {
            await Promise.all([csRequestPromise, closeResourcesPromise]);
            this.parentConversation.me.emit("media:stream:off", this.rtcObjects[leg_id].streamIndex);
            delete this.rtcObjects[leg_id];
            return "rtc:terminate:success";
        }
        catch (error) {
            throw error;
        }
    }
    _enableMediaTracks(tracks, enabled) {
        tracks.forEach((mediaTrack) => {
            mediaTrack.enabled = enabled;
        });
    }
    /**
     * Send a mute request with the rtc_id and enable/disable the tracks
     * If the mute request fails revert the changes in the tracks
     * @private
     */
    async _setMediaTracksAndMute(rtc_id, tracks, mute, mediaType) {
        this._enableMediaTracks(tracks, !mute);
        try {
            return await this.application.session.sendNetworkRequest({
                type: "POST",
                path: `conversations/${this.parentConversation.id}/events`,
                data: {
                    type: mediaType,
                    to: this.parentConversation.me.id,
                    from: this.parentConversation.me.id,
                    body: {
                        rtc_id,
                    },
                },
            });
        }
        catch (error) {
            this._enableMediaTracks(tracks, mute);
            throw new nexmoClientError_1.NexmoApiError(error);
        }
    }
    /**
     * Replaces the stream's audio tracks currently being used as the sender's sources with a new one
     * @param {object} constraints - audio constraints - { deviceId: { exact: selectedAudioDeviceId } }
     * @param {string} type - rtc object type - audio
     * @returns {Promise<MediaStream>} - Returns the new stream.
     * @example <caption>Update the stream currently being used with a new audio source</caption>
     * conversation.media.updateAudioConstraints({ deviceId: { exact: selectedAudioDeviceId } }, "audio")
     * .then((response) => {
     *   console.log(response);
     * }).catch((error) => {
     *   console.error(error);
     * });
     *
     *
     */
    async updateAudioConstraints(constraints = {}) {
        let rtcObjectByType = this._findRtcObjectByType('audio');
        if (rtcObjectByType && rtcObjectByType.pc) {
            try {
                const localStream = await rtc_helper_1.default.getUserAudio(constraints);
                localStream.getTracks().forEach((track) => {
                    const sender = rtcObjectByType.pc
                        .getSenders()
                        .find((s) => s.track.kind === track.kind);
                    if (sender) {
                        track.enabled = sender.track.enabled;
                        sender.replaceTrack(track);
                    }
                });
                rtc_helper_1.default.closeStream(rtcObjectByType.stream);
                rtcObjectByType.stream = localStream;
                return localStream;
            }
            catch (error) {
                return error;
            }
        }
        else {
            throw new nexmoClientError_1.NexmoApiError("error:media:stream:not-found");
        }
    }
    /**
     * Mute your Member
     *
     * @param {boolean} [mute=false] true for mute, false for unmute
     * @param {number} [streamIndex] stream id to set - if it's not set all streams will be muted
     * @example <caption>Mute your audio stream in the Conversation</caption>
     * // Mute your Member
     * conversation.media.mute(true);
     *
     * // Unmute your Member
     * conversation.media.mute(false);
     */
    mute(mute = false, streamIndex = null) {
        const state = mute ? "on" : "off";
        const audioType = "audio:mute:" + state;
        let promises = [];
        let muteObjects = {};
        if (streamIndex !== null) {
            muteObjects[0] = Object.values(this.rtcObjects).find((rtcObj) => rtcObj.streamIndex === streamIndex);
            if (!muteObjects[0]) {
                throw new nexmoClientError_1.NexmoClientError("error:media:stream:not-found");
            }
        }
        else {
            muteObjects = this.rtcObjects;
        }
        Object.values(muteObjects).forEach((rtcObject) => {
            const audioTracks = rtcObject.stream.getAudioTracks();
            const audioPromise = this._setMediaTracksAndMute(rtcObject.rtc_id, audioTracks, mute, audioType);
            promises.push(audioPromise);
        });
        return Promise.all(promises);
    }
    /**
     * Earmuff our member
     *
     * @param {boolean} [params]
     *
     * @returns {Promise}
     * @private
     */
    async earmuff(earmuff) {
        try {
            if (this.me === null) {
                throw new nexmoClientError_1.NexmoClientError("error:self");
            }
            else {
                let type = "audio:earmuff:off";
                if (earmuff) {
                    type = "audio:earmuff:on";
                }
                const { response, } = await this.application.session.sendNetworkRequest({
                    type: "POST",
                    path: `conversations/${this.parentConversation.id}/events`,
                    data: {
                        type,
                        to: this.parentConversation.me.id,
                    },
                });
                return response;
            }
        }
        catch (error) {
            throw new nexmoClientError_1.NexmoApiError(error);
        }
    }
    /**
     * Enable media participation in the conversation for this application (requires WebRTC)
     * @param {object} [params] - rtc params
     * @param {string} [params.label] - label is an application defined tag, eg. ‘fullscreen’
     * @param {string} [params.reconnectRtcId] - the rtc_id / leg_id of the call to reconnect to
     * @param {object} [params.audio=true] - audio enablement mode. possible values "both", "send_only", "receive_only", "none", true or false
     * @param {object} [params.autoPlayAudio=false] - attach the audio stream automatically to start playing after enable media (default false)
     * @param {object} [params.audioConstraints] - audio constraints to use
     * @param {boolean} [params.audioConstraints.autoGainControl] - a boolean which specifies whether automatic gain control is preferred and/or required
     * @param {boolean} [params.audioConstraints.echoCancellation] - a boolean specifying whether or not echo cancellation is preferred and/or required
     * @param {boolean} [params.audioConstraints.noiseSuppression] - a boolean which specifies whether noise suppression is preferred and/or required
     * @param {string | Array} [params.audioConstraints.deviceId] - object specifying a device ID or an array of device IDs which are acceptable and/or required
     * @returns {Promise<MediaStream>}
     * @example <caption>Enable media in the Conversation</caption>
     *
     * conversation.media.enable()
     * .then((stream) => {
     *    const media = document.createElement("audio");
     *    const source = document.createElement("source");
     *    const media_div = document.createElement("div");
     *    media.appendChild(source);
     *    media_div.appendChild(media);
     *    document.insertBefore(media_div);
     *    // Older browsers may not have srcObject
     *    if ("srcObject" in media) {
     *      media.srcObject = stream;
     *    } else {
     *      // Avoid using this in new browsers, as it is going away.
     *      media.src = window.URL.createObjectURL(stream);
     *    }
     *    media.onloadedmetadata = (e) => {
     *      media.play();
     *    };
     * }).catch((error) => {
     *    console.error(error);
     * });
     *
     **/
    async enable(params) {
        try {
            if (this.parentConversation.me === null) {
                throw new nexmoClientError_1.NexmoClientError("error:self");
            }
            else {
                const { offer } = (params !== null && params !== void 0 ? params : {});
                let remoteStream = await (offer !== undefined ? this._execAnswer(params) : this._handleAudio(params));
                // attach the audio stream automatically to start playing
                let autoPlayAudio = params &&
                    (params.autoPlayAudio || params.autoPlayAudio === undefined);
                if (!params || autoPlayAudio) {
                    rtc_helper_1.default.playAudioStream(remoteStream);
                }
                return remoteStream;
            }
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Disable media participation in the conversation for this application
     * if RtcStats MOS is enabled, a final report will be available in
     * NexmoClient#rtcstats:report
     * @returns {Promise}
     * @example <caption>Disable media in the Conversation</caption>
     *
     * conversation.media.disable()
     * .then((response) => {
     *   console.log(response);
     * }).catch((error) => {
     *   console.error(error);
     * });
     *
     **/
    disable() {
        let promises = [];
        promises.push(this._cleanConversationProperties());
        for (const leg_id in this.rtcObjects) {
            promises.push(this._disableLeg(leg_id));
        }
        return Promise.all(promises);
    }
    /**
     * Play a voice text in the Conversation
     * @param {object} params
     * @param {string} params.text - The text to say in the Conversation.
     * @param {string} [params.voice_name="Amy"] - Name of the voice to use for speech to text.
     * @param {number} [params.level=1] - Set the audio level of the audio stream: min=-1 max=1 increment=0.1.
     * @param {boolean} [params.queue=true] - ?
     * @param {boolean} [params.loop=1] - The number of times to repeat audio. Set to 0 to loop infinitely.
     * @param {boolean} [params.ssml=false] - Customize the spoken text with <a href="https://developer.nexmo.com/voice/voice-api/guides/customizing-tts">Speech Synthesis Markup Language (SSML)</a> specification
     *
     * @returns {Promise<NXMEvent>}
     * @example <caption>Play speech to text in the Conversation</caption>
     * conversation.media.sayText({text:"hi"})
     * .then((response) => {
     *    console.log(response);
     * })
     * .catch((error) => {
     *     console.error(error);
     * });
     *
     **/
    async sayText(params) {
        try {
            const response = await this.application.session.sendNetworkRequest({
                type: "POST",
                path: `conversations/${this.parentConversation.id}/events`,
                data: {
                    type: "audio:say",
                    cid: this.parentConversation.id,
                    from: this.parentConversation.me.id,
                    body: {
                        text: params.text,
                        voice_name: params.voice_name || "Amy",
                        level: params.level || 1,
                        queue: params.queue || true,
                        loop: params.loop || 1,
                        ssml: params.ssml || false,
                    },
                },
            });
            return new nxmEvent_1.default(this.parentConversation, response);
        }
        catch (error) {
            throw new nexmoClientError_1.NexmoApiError(error);
        }
    }
    /**
     * Send DTMF in the Conversation
     * @param {string} digit - the DTMF digit(s) to send
     *
     * @returns {Promise<NXMEvent>}
     * @example <caption>Send DTMF in the Conversation</caption>
     * conversation.media.sendDTMF("digit");
     * .then((response) => {
     *    console.log(response);
     * })
     * .catch((error) => {
     *     console.error(error);
     * });
     **/
    async sendDTMF(digit) {
        try {
            if (!utils_1.default.validateDTMF(digit)) {
                throw new nexmoClientError_1.NexmoClientError("error:audio:dtmf:invalid-digit");
            }
            const rtc_id = (this._findRtcObjectByType('audio') || {}).rtc_id;
            if (!rtc_id) {
                throw new nexmoClientError_1.NexmoClientError("error:audio:dtmf:audio-disabled");
            }
            const { id, timestamp, } = await this.application.session.sendNetworkRequest({
                type: "POST",
                path: `conversations/${this.parentConversation.id}/events`,
                data: {
                    type: "audio:dtmf",
                    from: this.parentConversation.me.id,
                    body: {
                        digit,
                        channel: {
                            type: "app",
                            id: this._findRtcObjectByType('audio').rtc_id
                        }
                    },
                },
            });
            const placeholder_event = {
                body: {
                    digit,
                    dtmf_id: "",
                },
                cid: this.parentConversation.id,
                from: this.parentConversation.me.id,
                id,
                timestamp,
                type: "audio:dtmf",
            };
            const dtmfEvent = new nxmEvent_1.default(this.parentConversation, placeholder_event);
            this.parentConversation.events.set(placeholder_event.id, dtmfEvent);
            return dtmfEvent;
        }
        catch (error) {
            throw new nexmoClientError_1.NexmoApiError(error);
        }
    }
    /**
     * Play an audio stream in the Conversation
     * @param {object} params
     * @param {number} params.level - Set the audio level of the audio stream: min=-1 max=1 increment=0.1.
     * @param {array} params.stream_url - Link to the audio file.
     * @param {number} params.loop - The number of times to repeat audio. Set to 0 to loop infinitely.
     *
     * @returns {Promise<NXMEvent>}
     * @example <caption>Play an audio stream in the Conversation</caption>
     * conversation.media.playStream({ level: 0.5, stream_url: ["https://nexmo-community.github.io/ncco-examples/assets/voice_api_audio_streaming.mp3"], loop: 1 })
     * .then((response) => {
     *   console.log("response: ", response);
     * })
     * .catch((error) => {
     *   console.error("error: ", error);
     * });
     *
     */
    async playStream(params) {
        try {
            const response = await this.application.session.sendNetworkRequest({
                type: "POST",
                path: `conversations/${this.parentConversation.id}/events`,
                data: {
                    type: "audio:play",
                    body: params,
                },
            });
            return new nxmEvent_1.default(this.parentConversation, response);
        }
        catch (error) {
            throw new nexmoClientError_1.NexmoApiError(error);
        }
    }
    /**
     * Send start ringing event
     * @returns {Promise<NXMEvent>}
     * @example <caption>Send start ringing event in the Conversation</caption>
     *
     * conversation.media.startRinging()
     * .then((response) => {
     *    console.log(response);
     * }).catch((error) => {
     *    console.error(error);
     * });
     *
     * // Listen for start ringing event
     * conversation.on('audio:ringing:start', (data) => {
     *    console.log("ringing started: ", data);
     * });
     *
     */
    async startRinging() {
        try {
            const response = await this.application.session.sendNetworkRequest({
                type: "POST",
                path: `conversations/${this.parentConversation.id}/events`,
                data: {
                    type: "audio:ringing:start",
                    from: this.parentConversation.me.id,
                    body: {},
                },
            });
            return new nxmEvent_1.default(this.parentConversation, response);
        }
        catch (error) {
            throw new nexmoClientError_1.NexmoApiError(error);
        }
    }
    /**
     * Send stop ringing event
     * @returns {Promise<NXMEvent>}
     * @example <caption>Send stop ringing event in the Conversation</caption>
     *
     * conversation.media.stopRinging()
     * .then((response) => {
     *    console.log(response);
     * }).catch((error) => {
     *    console.error(error);
     * });
     *
     * // Listen for stop ringing event
     * conversation.on('audio:ringing:stop', (data) => {
     *    console.log("ringing stopped: ", data);
     * });
     *
     */
    async stopRinging() {
        try {
            const response = await this.application.session.sendNetworkRequest({
                type: "POST",
                path: `conversations/${this.parentConversation.id}/events`,
                data: {
                    type: "audio:ringing:stop",
                    from: this.parentConversation.me.id,
                    body: {},
                },
            });
            return new nxmEvent_1.default(this.parentConversation, response);
        }
        catch (error) {
            throw new nexmoClientError_1.NexmoApiError(error);
        }
    }
}
exports.default = Media;
module.exports = Media;
