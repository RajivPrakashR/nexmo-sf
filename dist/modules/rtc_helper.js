'use strict';
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Nexmo Client SDK
 *
 * Copyright (c) Nexmo Inc.
 */
require('webrtc-adapter');
const sdptransform = require('sdp-transform');
const loglevel_1 = require("loglevel");
const browserDetect = __importStar(require("detect-browser"));
const nexmoClientError_1 = require("../nexmoClientError");
const rtcstats_analytics_1 = __importDefault(require("./rtcstats_analytics"));
const clearingTimeout = 20000;
/**
 * RTC helper object for accessing webRTC API.
 * @class RtcHelper
 * @private
*/
class RtcHelper {
    constructor() {
        this.log = loglevel_1.getLogger(this.constructor.name);
    }
    static getUserAudio(audioConstraints = true) {
        let constraintsToUse = {
            video: false,
            audio: audioConstraints
        };
        return navigator.mediaDevices.getUserMedia(constraintsToUse);
    }
    createRTCPeerConnection(config) {
        const pc = new RTCPeerConnection(config);
        // attaching the .trace to make easier the stats reporting implementation
        pc.trace = () => {
            return;
        };
        return pc;
    }
    _getWindowLocationProtocol() {
        return window.location.protocol;
    }
    static _getBrowserName() {
        return browserDetect.detect().name;
    }
    static isNode() {
        return this._getBrowserName() === 'node';
    }
    /**
      * Check if the keys in an object are found in another object
    */
    checkValidKeys(object, defaultObject) {
        let valid = true;
        Object.keys(object).forEach((key) => {
            if (!defaultObject.hasOwnProperty(key)) {
                valid = false;
            }
            ;
        });
        return valid;
    }
    ;
    static cleanCallMediaIfFailed(call) {
        setTimeout(() => {
            if (!call.conversation) {
                this.cleanMediaProperties(call);
                call.status = call.CALL_STATUS.FAILED;
                call.application.emit('call:status:changed', call);
            }
        }, 5000);
    }
    static callDisconnectHandler(call, pc) {
        const callStatus = [call.CALL_STATUS.ANSWERED, call.CALL_STATUS.STARTED, call.CALL_STATUS.RINGING];
        if (pc.connectionState !== 'disconnected' || !call || !call.conversation)
            return;
        // Timeout and wait for FS 20 seconds on backend until normal clearing
        return setTimeout(() => {
            if (pc.connectionState === 'connected' || callStatus.indexOf(call.status) == -1)
                return;
            this.cleanMediaProperties(call);
            call.status = call.CALL_STATUS.COMPLETED;
            call.application.emit('call:status:changed', call);
        }, clearingTimeout);
    }
    static cleanMediaProperties(call) {
        if (call.rtcObjects) {
            for (const leg_id in call.rtcObjects) {
                call.rtcObjects[leg_id].pc.close();
                delete call.rtcObjects[leg_id].pc;
                RtcHelper.closeStream(call.rtcObjects[leg_id].stream);
            }
        }
        call.application.activeStreams = [];
        call.rtcObjects = {};
        if (call.conversation && call.conversation.media)
            call.conversation.media.rtcStats = null;
    }
    static playAudioStream(stream) {
        const audio = new Audio();
        audio.srcObject = stream;
        audio.autoplay = true;
        return audio;
    }
    // Media methods
    static createDummyCandidateSDP(pc) {
        const candidate = {
            foundation: 1176891032,
            component: 1,
            transport: 'udp',
            priority: 2122260223,
            ip: '0.0.0.0',
            port: 9,
            type: 'host',
            generation: 0,
            'network-id': 1,
            'network-cost': 50
        };
        const sdpNewObj = sdptransform.parse(pc.localDescription.sdp);
        sdpNewObj.media[0].candidates = [candidate];
        return sdptransform.write(sdpNewObj);
    }
    static createRTCPeerConnectionConfig(application) {
        return {
            iceTransportPolicy: 'all',
            bundlePolicy: 'balanced',
            rtcpMuxPolicy: 'require',
            iceCandidatePoolSize: '0',
            ...(application.session.config &&
                application.session.config.iceServers && {
                iceServers: application.session.config.iceServers
            })
        };
    }
    static createPeerConnection(application) {
        const pc_config = this.createRTCPeerConnectionConfig(application);
        const pc = new RTCPeerConnection(pc_config);
        return pc;
    }
    static sendOffer(application, pc, conversation, reconnectRtcId) {
        const sdp = this.createDummyCandidateSDP(pc);
        const offer = { sdp };
        let data = {
            from: conversation.me.id,
            body: { offer }
        };
        let path = `conversations/${conversation.id}/rtc`;
        if (reconnectRtcId) {
            path += `/${reconnectRtcId}/offer`;
        }
        return application.session.sendNetworkRequest({
            type: 'POST',
            path,
            data
        });
    }
    ;
    static sendAnswer(application, pc, conversation, leg_id) {
        const answer = this.createDummyCandidateSDP(pc);
        let data = {
            from: conversation.me.id,
            body: { answer }
        };
        let path = `conversations/${conversation.id}/rtc/${leg_id}/answer`;
        return application.session.sendNetworkRequest({
            type: 'POST',
            path,
            data
        });
    }
    ;
    static createLeg(application, pc) {
        const sdpOfferNew = this.createDummyCandidateSDP(pc);
        const offer = { sdp: sdpOfferNew, type: "offer" };
        return application.session.sendNetworkRequest({
            type: 'POST',
            path: `legs`,
            version: `beta`,
            data: {
                body: {
                    offer
                }
            }
        });
    }
    static closeStream(stream) {
        stream.getTracks().forEach((track) => {
            track.stop();
        });
    }
    static emitMediaStream(member, pc, stream) {
        member.emit("media:stream:on", {
            pc,
            stream,
            type: "audio",
            streamIndex: 0
        });
    }
    static _initStatsEvents(context) {
        var _a, _b, _c, _d;
        if (RtcHelper.isNode())
            return;
        if ((_d = (_c = (_b = (_a = context) === null || _a === void 0 ? void 0 : _a.application) === null || _b === void 0 ? void 0 : _b.session) === null || _c === void 0 ? void 0 : _c.config) === null || _d === void 0 ? void 0 : _d.rtcstats) {
            const config = context.application.session.config.rtcstats;
            const { emit_events, remote_collection, emit_rtc_analytics, } = config;
            if (emit_events || remote_collection || emit_rtc_analytics) {
                const params = { ...context, config: { ...config } };
                return new rtcstats_analytics_1.default(params);
            }
        }
    }
    static attachConversationEventHandlers(context) {
        const { conversation, pc, log } = context;
        // We want to be able to handle these events, for this  member, before they get propagated out
        conversation.once("rtc:answer", (event) => {
            if (!pc) {
                log.warn("RTC: received an answer too late");
                return;
            }
            pc.setRemoteDescription(new RTCSessionDescription({
                type: "answer",
                sdp: event.body.answer,
            }));
        });
    }
    static doAnswer(context, offer, leg_id) {
        const { application, conversation, pc, reject, localStream } = context;
        this.addPeerConnectionListeners(context, () => RtcHelper.sendAnswer(application, pc, conversation, leg_id).then(() => ({ rtc_id: leg_id })));
        pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: offer }))
            .then(() => pc.createAnswer())
            .then((sessionDescription) => pc.setLocalDescription(sessionDescription))
            .catch((err) => {
            if (localStream)
                this.closeStream(localStream);
            reject(err);
        });
    }
    static attachPeerConnectionEventHandlers(context) {
        const { application, conversation, pc, reconnectRtcId } = context;
        this.addPeerConnectionListeners(context, () => RtcHelper.sendOffer(application, pc, conversation, reconnectRtcId));
    }
    static addPeerConnectionListeners(context, description_handler) {
        const { application, conversation, pc, streamIndex, localStream, log, rtcObjects, resolve, reject } = context;
        let stream;
        let stop_ice_gathering = false;
        let nxmCall;
        if (conversation.id) {
            nxmCall = application.calls.get(conversation.id);
        }
        pc.ontrack = (evt) => {
            stream = evt.streams[0];
            application.activeStreams.push(stream);
            RtcHelper.emitMediaStream(conversation.me, pc, stream);
        };
        pc.onconnectionstatechange = (_) => this.onconnectionstatechangeHandler(pc, log, nxmCall, () => resolve(stream), () => reject());
        pc.onnegotiationneeded = () => this.onnegotiationneededHandler(pc, (nexmoError) => reject(nexmoError));
        pc.oniceconnectionstatechange = (connection_event) => this.oniceconnectionstatechange(connection_event, pc, log, (nexmoError) => reject(nexmoError));
        pc.onicecandidate = async (event) => {
            if (event.candidate && !stop_ice_gathering && pc) {
                stop_ice_gathering = true;
                try {
                    const { rtc_id } = await description_handler();
                    RtcHelper._initStatsEvents({
                        application,
                        rtc_id,
                        pc,
                        conversation
                    });
                    //attach rtc stats with rtc_id
                    if (pc.trace)
                        pc.trace("rtc_id", rtc_id);
                    rtcObjects[rtc_id] = {
                        rtc_id,
                        pc,
                        stream: localStream,
                        type: "audio",
                        streamIndex: streamIndex,
                    };
                }
                catch (error) {
                    if (localStream)
                        this.closeStream(localStream);
                    reject(new nexmoClientError_1.NexmoClientError(error));
                }
            }
        };
        localStream.getTracks().forEach((track) => pc.addTrack(track));
    }
    static prewarmLeg(nxmCall) {
        const application = nxmCall.application;
        return new Promise(async (resolve, reject) => {
            let offer_sent = false;
            let stream;
            let legId;
            let rtcObjects = {};
            const log = loglevel_1.getLogger(this.constructor.name);
            try {
                let localStream = await this.getUserAudio();
                const pc = this.createPeerConnection(application);
                // create call
                pc.ontrack = (evt) => {
                    stream = evt.streams[0];
                    application.activeStreams.push(stream);
                };
                pc.onconnectionstatechange = (event) => this.onconnectionstatechangeHandler(pc, log, nxmCall, () => resolve({ stream, legId, rtcObjects }), () => reject());
                pc.onnegotiationneeded = () => this.onnegotiationneededHandler(pc, (nexmoError) => reject(nexmoError));
                pc.oniceconnectionstatechange = (connection_event) => this.oniceconnectionstatechange(connection_event, pc, log, (nexmoError) => reject(nexmoError));
                pc.onicecandidate = async (event) => {
                    if (event.candidate && !offer_sent && pc) {
                        offer_sent = true;
                        const { rtc_id, sdp } = await this.createLeg(application, pc);
                        RtcHelper._initStatsEvents({
                            application,
                            rtc_id,
                            pc,
                        });
                        legId = rtc_id;
                        rtcObjects[legId] = {
                            rtc_id,
                            pc,
                            stream: localStream,
                            type: "audio",
                            streamIndex: 1,
                        };
                        return pc.setRemoteDescription(new RTCSessionDescription({
                            type: "answer",
                            sdp,
                        }));
                    }
                };
                localStream.getTracks().forEach((track) => pc.addTrack(track));
            }
            catch (error) {
                reject(new nexmoClientError_1.NexmoClientError(error));
            }
        });
    }
}
exports.default = RtcHelper;
RtcHelper.onconnectionstatechangeHandler = (pc, log, nxmCall, resolveCallback, rejectCallback) => {
    switch (pc.connectionState) {
        case "connected":
            log.info("The connection has become fully connected");
            resolveCallback();
            break;
        case "disconnected":
            if (!nxmCall)
                break;
            if (nxmCall.call_disconnect_timeout) {
                clearTimeout(nxmCall.call_disconnect_timeout);
            }
            nxmCall.call_disconnect_timeout = RtcHelper.callDisconnectHandler(nxmCall, pc);
            break;
        case "failed":
            rejectCallback();
            log.info("One or more transports has terminated unexpectedly or in an error");
            break;
        case "closed":
            log.info("The connection has been closed");
            break;
    }
};
RtcHelper.oniceconnectionstatechange = (connection_event, pc, log, rejectCallback) => {
    switch (pc.iceConnectionState) {
        // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/iceConnectionState
        case "disconnected":
            log.warn("One or more transports is disconnected", pc.iceConnectionState);
            break;
        case "failed":
            rejectCallback(new nexmoClientError_1.NexmoClientError(connection_event));
            log.warn("One or more transports has terminated unexpectedly or in an error", connection_event);
            break;
        default:
            log.info("The ice connection status changed", pc.iceConnectionState);
    }
};
RtcHelper.onnegotiationneededHandler = async (pc, rejectCallback) => {
    try {
        const offer = await pc.createOffer();
        return pc.setLocalDescription(offer);
    }
    catch (error) {
        rejectCallback(new nexmoClientError_1.NexmoClientError(error));
    }
};
module.exports = RtcHelper;
