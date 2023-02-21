'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Nexmo Client SDK
 *  Utility functions
 *
 * Copyright (c) Nexmo Inc.
 */
const uuid_1 = __importDefault(require("uuid"));
const socket_io_client_1 = __importDefault(require("socket.io-client"));
const application_1 = __importDefault(require("./application"));
const MEDIA_CONNECTIVITY_TIMEOUT = 40000; // 40s is the default timeout for ice candidates gathering
const WS_CONNECTIVITY_TIMEOUT = 20000; // 20s is the default timeout for ws connection
/**
 * Utilities class for the SDK.
 *
 * @class Utils
 * @private
 */
class Utils {
    /**
     * Get the Member from the username of a conversation
     *
     * @param {string} username the username of the member to get
     * @param {Conversation} conversation the Conversation to search in
     * @returns {Member} the requested Member
     * @static
     */
    static getMemberFromNameOrNull(conversation, username) {
        if (!conversation || !username)
            return null;
        for (let member of conversation.members.values()) {
            if (member.user.name === username) {
                return member;
            }
        }
        return null;
    }
    /**
     * Get the Member's number or uri from the event's channel field
     *
     * @param {object} channel the event's channel field
     * @returns {string} the requested Member number or uri
     * @static
     */
    static getMemberNumberFromEventOrNull(channel) {
        const from = channel && channel.from;
        if (from && (from.number || from.uri)) {
            return from.number || from.uri;
        }
        return null;
    }
    /**
     * Perform a network request to the given url
     *
     * @param {object} reqObject the object that has all the information for the request
     * @param {string} url the request url
     * @param {string} type=GET|POST|PUT|DELETE the types of the network request
     * @param {object} [data] the data that are going to be sent
     * @param {string} [responseType] the response type of the request
     * @param {string} token the jwt token for the network request
     * @returns {Promise<NetworkRequestResponse>} the NetworkRequestResponse
     * @static
     */
    static networkRequest(reqObject) {
        return new Promise((resolve, reject) => {
            if (!reqObject.token &&
                !reqObject.url.includes('logging') &&
                !reqObject.url.includes('ping')) {
                // eslint-disable-next-line prefer-promise-reject-errors
                reject({
                    response: {
                        type: 'error:user:token',
                        description: 'network error on request. Please create a new session.'
                    }
                });
            }
            const xhr = new XMLHttpRequest();
            let data;
            xhr.open(reqObject.type, reqObject.url, true);
            if (reqObject.token) {
                xhr.setRequestHeader('Authorization', 'Bearer ' + reqObject.token);
            }
            if (reqObject && reqObject.url.includes('image')) {
                xhr.responseType = '';
                data = reqObject.data;
                xhr.onloadstart = () => {
                    resolve(xhr);
                };
            }
            else {
                xhr.responseType = reqObject.responseType || 'json';
                data = JSON.stringify(reqObject.data) || null;
                xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
            }
            xhr.onload = () => {
                if (xhr.status === 200 || xhr.status === 201 || xhr.status === 204) {
                    resolve(xhr);
                }
                else {
                    reject(xhr);
                }
            };
            xhr.onerror = (error) => {
                reject(error);
            };
            xhr.send(data);
        });
    }
    /**
     * Perform a GET network request for fetching paginated conversations and events
     *
     * @param {string} url the request url
     * @param {object} [params] network request params
     * @param {string} [params.cursor] cursor parameter to access the next or previous page of a data set
     * @param {number} [params.page_size] the number of resources returned in a single request list
     * @param {string} [params.order] 'asc' or 'desc' ordering of resources (usually based on creation time)
     * @param {string} [params.event_type] the type of event used to filter event requests ('member:joined', 'audio:dtmf', etc)
     * @param {string} token the jwt token for the network request
     * @param {string} [version=Application.CONVERSATION_API_VERSION.v1] version of conversation service that is used for the request (one of v1 and v3)
     *
     * @returns {Promise<XMLHttpRequest.response>} the XMLHttpRequest
     * @static
     * @example <caption>Sending a nexmo GET request</caption>
     *    paginationRequest(url, params).then((response) => {
     *      response.items: {},
     *      response.cursor: {
     *          prev: '',
     *          next: '',
     *          self: ''
     *      },
     *      response.page_size: 10,
     *      response.order: 'asc',
     *   });
     */
    static async paginationRequest(url, params, token, version = application_1.default.CONVERSATION_API_VERSION.v1) {
        try {
            const xhr = await Utils.networkRequest({
                type: 'GET',
                url: Utils.addUrlSearchParams(url, params),
                token
            });
            const { page_size, _embedded, _links } = xhr.response;
            const resource = url.split('/').pop().trim();
            return {
                items: (version === application_1.default.CONVERSATION_API_VERSION.v1) ? _embedded.data[resource] : _embedded[resource],
                cursor: {
                    prev: _links.prev ? new URLSearchParams(_links.prev.href).get('cursor') : '',
                    next: _links.next ? new URLSearchParams(_links.next.href).get('cursor') : '',
                    self: _links.self ? new URLSearchParams(_links.self.href).get('cursor') : ''
                },
                page_size: page_size,
                order: params.order || 'asc',
                event_type: params.event_type || null
            };
        }
        catch ({ response }) {
            const parsed_error = response ?
                response : { type: 'error:network:get-request', description: 'network error on nexmo get request' };
            if (parsed_error.validation) {
                parsed_error.description = parsed_error.validation[Object.keys(parsed_error.validation)[0]];
            }
            throw parsed_error;
        }
    }
    /**
     * Update the Search Params of a url
     * @returns {string} the appended url
     * @static
     */
    static addUrlSearchParams(url, params = {}) {
        let appended_url = new URL(url);
        Object.keys(params).forEach((key) => {
            if (params[key] && !(typeof params[key] === 'string' && params[key].length < 1) && params[key] !== null) {
                appended_url.searchParams.set(key, params[key]);
            }
        });
        return appended_url.href;
    }
    /**
     * Deep merges two objects
     * @returns {Object} the new merged object
     * @static
     */
    static deepMergeObj(obj1, obj2) {
        const mergedObj = JSON.parse(JSON.stringify(obj1));
        // Merge the object into the new mergedObject
        for (let prop in obj2) {
            // If the property is an object then merge properties
            if (Object.prototype.toString.call(obj2[prop]) === '[object Object]') {
                mergedObj[prop] = Utils.deepMergeObj(mergedObj[prop], obj2[prop]);
            }
            else {
                mergedObj[prop] = obj2[prop];
            }
        }
        return mergedObj;
    }
    /**
     * Inject a script into the document
     *
     * @param {string} s script being executed
     * @param {requestCallback} c the callback fired after script executed
     * @static
     */
    static injectScript(u, c) {
        if (typeof document !== 'undefined') {
            let h = document.getElementsByTagName('head')[0];
            let s = document.createElement('script');
            s.async = true;
            s.src = u;
            s.onload = s.onreadystatechange = () => {
                if (!s.readyState || /loaded|complete/.test(s.readyState)) {
                    s.onload = s.onreadystatechange = null;
                    s = null;
                    if (c) {
                        c();
                    }
                }
            };
            h.insertBefore(s, h.firstChild);
        }
    }
    static allocateUUID() {
        return uuid_1.default.v4();
    }
    /**
     * Validate dtmf digit
     * @static
     */
    static validateDTMF(digit) {
        return typeof digit === 'string' ? /^[\da-dA-D#*pP]{1,45}$$/.test(digit) : false;
    }
    /**
     * Get the nexmo bugsnag api key
     * @private
     */
    static _getBugsnagKey() {
        return '76498fc1ca8d9b0a173a44e2b873d7ed';
    }
    /**
     * Update the member legs array with the new one received in the event
     *
     * @param {Array} legs the member legs array
     * @param {NXMEvent} event the member event holding the new legs array
     * @static
     */
    static updateMemberLegs(legs, event) {
        if (legs) {
            // find the leg in the legs array if exists
            const leg = legs.find((leg) => leg.leg_id === event.body.leg_id);
            if (!leg) {
                legs.push({
                    leg_id: event.body.leg_id,
                    status: event.body.status
                });
            }
            else if (leg.status !== event.body.status) {
                // if the status of the leg is different from the event status
                // update the leg object with the new leg status
                let index = legs.indexOf(leg);
                legs.fill(leg.status = event.body.status, index, index++);
            }
        }
        else {
            legs = [{
                    leg_id: event.body.leg_id,
                    status: event.body.status
                }];
        }
        return legs;
    }
    /**
     * Check if the event is referenced to a call or simple conversation
     * @private
     */
    static _isCallEvent(event) {
        const { channel, media } = event.body;
        // in case we have a transfer we should fetch the conversation
        // including the new membership
        if (event.type === "rtc:transfer")
            return true;
        // this check differentiates the call flow with the non call
        // IP-PSTN (member:joined) should have an knocking_id inside the channel
        // PSTN-IP and IP-IP (member:invited) should have audio_settings.enabled = true
        if (channel && ((media && media.audio_settings && media.audio_settings.enabled) ||
            (media && media.audio && media.audio.enabled) || channel.knocking_id)) {
            return true;
        }
        return false;
    }
    /**
     * Fetch an image from Media Service
     * @private
     */
    static async _fetchImage(url, token) {
        const { response } = await Utils.networkRequest({
            type: 'GET',
            url,
            responseType: 'arraybuffer',
            token
        });
        const responseArray = new Uint8Array(response);
        // Convert the int array to a binary String
        // We have to use apply() as we are converting an *array*
        // and String.fromCharCode() takes one or more single values, not
        // an array.
        // support large image files (Chunking)
        let res = '';
        const chunk = 8 * 1024;
        let i;
        for (i = 0; i < responseArray.length / chunk; i++) {
            res += String.fromCharCode.apply(null, responseArray.subarray(i * chunk, (i + 1) * chunk));
        }
        res += String.fromCharCode.apply(null, responseArray.subarray(i * chunk));
        return 'data:image/jpeg;base64,' + btoa(res);
    }
    /**
     * Check if HTTP URL is reachable
     * @private
     */
    static async _checkHttpConnectivity(url) {
        const timeBeforeConnecting = Date.now();
        try {
            await Utils.networkRequest({
                type: 'GET',
                url
            });
            const connectionTime = Date.now() - timeBeforeConnecting;
            return { url, canConnect: true, connectionTime };
        }
        catch (error) {
            return { url, canConnect: false, error };
        }
    }
    /**
     * Check if websocket URL is reachable
     * @private
     */
    static _checkWsConnectivity(ws_url, path, config) {
        return new Promise((resolve, reject) => {
            const socket_io_config = Object.assign({ path }, config);
            const timeBeforeConnecting = Date.now();
            const connection = socket_io_client_1.default.connect(ws_url, socket_io_config);
            const timeout = setTimeout(() => resolve({ url: ws_url, canConnect: false }), WS_CONNECTIVITY_TIMEOUT);
            connection.on('connect', () => {
                const connectionTime = Date.now() - timeBeforeConnecting;
                connection.disconnect();
                clearTimeout(timeout);
                resolve({ url: ws_url, canConnect: true, connectionTime });
            });
            connection.on('error', (error) => {
                connection.disconnect();
                clearTimeout(timeout);
                resolve({ url: ws_url, canConnect: false, error });
            });
        });
    }
    /**
     * Return a list with the connection health of the Media Servers
     * @private
     */
    static async _checkMediaServers(token, nexmo_api_url, datacenter) {
        try {
            const { response } = await Utils.networkRequest({
                type: 'GET',
                url: `${nexmo_api_url}/v0.3/discovery/media/${datacenter}`,
                token
            });
            const reqList = response.map((host) => Utils._checkMediaConnectivity(host.ip, host.port));
            return await Promise.all(reqList);
        }
        catch (error) {
            return [];
        }
    }
    /**
     * Check if we can establish a peer connection with a specific Media Server
     * @private
     */
    static async _checkMediaConnectivity(ip, port) {
        return new Promise(async (resolve, reject) => {
            const configuration = { iceServers: [{ urls: `stun:${ip}:${port}` }] };
            const pc = new RTCPeerConnection(configuration);
            const timeBeforeConnecting = Date.now();
            const offer = await pc.createOffer({ offerToReceiveAudio: true });
            pc.setLocalDescription(offer);
            const timeout = setTimeout(() => {
                pc.close();
                resolve({ ip, canConnect: false });
            }, MEDIA_CONNECTIVITY_TIMEOUT);
            pc.onicecandidate = ({ candidate }) => {
                var _a;
                if (((_a = candidate) === null || _a === void 0 ? void 0 : _a.type) === "srflx") {
                    const connectionTime = Date.now() - timeBeforeConnecting;
                    // Connection established successfully
                    clearTimeout(timeout);
                    pc.close();
                    resolve({ ip, canConnect: true, connectionTime });
                }
            };
            pc.onicecandidateerror = (event) => {
                if (event.errorCode) {
                    pc.close();
                    clearTimeout(timeout);
                    resolve({ ip, canConnect: false, error: event });
                }
            };
        });
    }
    /**
     * Check if the user is re invited to an existing conversation
     * @private
     */
    static _checkIfUserIsReInvited(conversations, event) {
        var _a;
        if (!conversations.has(event.cid))
            return false;
        if (!(event.type === 'member:invited' || event.type === 'member:joined'))
            return false;
        const me = (_a = conversations.get(event.cid)) === null || _a === void 0 ? void 0 : _a.me;
        if (!me)
            return false;
        if (me.user.name === event.body.user.name && me.state === 'LEFT')
            return true;
        return false;
    }
}
exports.default = Utils;
module.exports = Utils;
