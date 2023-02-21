'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Nexmo Client SDK
 *  Main wrapper
 *
 * Copyright (c) Nexmo Inc.
*/
const WildEmitter = require('wildemitter');
const loglevel_plugin_prefix_1 = __importDefault(require("loglevel-plugin-prefix"));
const loglevel_1 = __importDefault(require("loglevel"));
const nexmoClientError_1 = require("./nexmoClientError");
const socket_io_client_1 = __importDefault(require("socket.io-client"));
const js_1 = __importDefault(require("@bugsnag/js"));
const publicip_1 = __importDefault(require("./modules/publicip"));
const utils_1 = __importDefault(require("./utils"));
const application_1 = __importDefault(require("./application"));
const errors_emitter_1 = __importDefault(require("./modules/errors_emitter"));
const user_1 = __importDefault(require("./user"));
const rtc_helper_1 = __importDefault(require("./modules/rtc_helper"));
loglevel_plugin_prefix_1.default.reg(loglevel_1.default);
loglevel_plugin_prefix_1.default.apply(loglevel_1.default, {
    template: '[%t] %l (NXM-%n):',
    timestampFormatter: (date) => {
        return date.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, '$1');
    },
    levelFormatter: (level) => {
        return level.toUpperCase();
    },
    nameFormatter: (name) => {
        return name || 'SDK';
    }
});
/**
 * The parent NexmoClient class.
 *
 * @class NexmoClient
 *
 * @param {object} params the settings to initialise the SDK
 * @param {string} params.debug='silent' set mode to 'debug', 'info', 'warn', or 'error' for customized logging levels in the console
 * @param {string} params.url='nexmo_ws_url' Nexmo Conversation Websocket url, default is wss://ws.nexmo.com (wss://ws-us-1.nexmo.com for WDC, wss://ws-us-2.nexmo.com for DAL, wss://ws-eu-1.nexmo.com for LON, wss://ws-sg-1.nexmo.com for SNG)
 * @param {string} params.nexmo_api_url=Nexmo Conversation Api url, default is https://api.nexmo.com (https://api-us-1.nexmo.com for WDC, https://api-us-2.nexmo.com for DAL, https://api-eu-1.nexmo.com for LON, https://api-sg-1.nexmo.com for SNG)
 * @param {string} params.ips_url='ips_url' Nexmo IPS url for image upload, default is https://api.nexmo.com/v1/image (https://api-us-1.nexmo.com/v1/image for WDC, https://api-us-2.nexmo.com/v1/image for DAL, https://api-eu-1.nexmo.com/v1/image for LON, https://api-sg-1.nexmo.com/v1/image for SNG)
 * @param {string} params.path='/v2/rtc' Nexmo Conversation Websocket url path suffix
 * @param {RTCStatsConfig} params.rtcstats set reporting for stream statistics (Internal event emit)
 * @param {Boolean} params.rtcstats.emit_events=false receive rtcstats:report event (deprecated)
 * @param {Boolean} params.rtcstats.emit_rtc_analytics=false receive rtcstats:analytics event
 * @param {number} params.rtcstats.emit_interval=1000 interval in ms for rtcstats:report and rtcstats:analytics
 * @param {Boolean} params.rtcstats.remote_collection=true collect client logs internally
 * @param {Boolean} params.rtcstats.remote_collection_url='gollum_url' url for collecting client logs internally
 * @param {number} params.rtcstats.remote_collection_interval=5000 interval in ms to collect client logs internally
 * @param {object} params.socket_io configure socket.io
 * @param {Boolean} params.socket_io.forceNew=true configure socket.io forceNew attribute
 * @param {Boolean} params.socket_io.autoConnect=true socket.io autoConnect attribute
 * @param {Boolean} params.socket_io.reconnection=true socket.io reconnection attribute
 * @param {number} params.socket_io.reconnectionAttempts=5 socket.io reconnectionAttempts attribute
 * @param {string[]} params.socket_io.transports='websocket' socket.io transports protocols
 * @param {string} params.sync='none' {'none' || 'lite' || 'full'} after a successful session creation, synchronise conversations, include events or nothing
 * @param {string} params.environment='production' development / production environment
 * @param {object[]} params.iceServers configure iceServers for RTCPeerConnection
 * @param {string} params.iceServers.urls=[] urls for iceServers
 * @param {object} params.log_reporter configure log reports for bugsnag tool
 * @param {Boolean} params.log_reporter.enabled=true
 * @param {string} params.log_reporter.bugsnag_key your bugsnag api key / defaults to Nexmo api key
 * @param {object} params.conversations_page_config configure paginated requests for conversations
 * @param {number} params.conversations_page_config.page_size=10 the number of resources returned in a single request list
 * @param {string} params.conversations_page_config.order=asc 'asc' or 'desc' ordering of resources (usually based on creation time)
 * @param {string} params.conversations_page_config.cursor cursor parameter to access the next or previous page of a data set
 * @param {object} params.events_page_config configure paginated requests for events
 * @param {number} params.events_page_config.page_size=10 the number of resources returned in a single request list
 * @param {string} params.events_page_config.order=asc 'asc' or 'desc' ordering of resources (usually based on creation time)
 * @param {string} params.events_page_config.event_type the type of event used to filter event requests. Supports wildcard options with :* eg. 'members:*'
 * @param {Boolean} params.enableEventsQueue=true mechanism to guarantee order of events received during a session
 * @param {string} params.token the jwt token for network requests
 *
 * @emits NexmoClient#connecting
 * @emits NexmoClient#disconnect
 * @emits NexmoClient#error
 * @emits NexmoClient#ready
 * @emits NexmoClient#reconnect
 * @emits NexmoClient#reconnecting
*/
class NexmoClient {
    constructor(params = {}) {
        // save an array of instances
        const inputParams = params;
        this.config = {
            debug: 'silent',
            log_reporter: {
                enabled: false,
                bugsnag_key: null
            },
            environment: 'production',
            ips_url: 'https://api-us.vonage.com/v1/image',
            nexmo_api_url: 'https://api-us.vonage.com',
            path: '/v2/rtc',
            repository: 'https://github.com/Nexmo/conversation-js-sdk',
            SDK_version: '9.2.0',
            socket_io: {
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 2000,
                randomizationFactor: 0.75,
                reconnectionDelayMax: 15000,
                forceNew: true,
                autoConnect: true,
                transports: ['websocket']
            },
            sync: 'none',
            url: 'https://ws-us.vonage.com',
            iceServers: [],
            rtcstats: {
                remote_collection: true,
                remote_collection_url: 'https://hlg.tokbox.com/prod/logging/nexmo_client_js_stats',
                remote_collection_interval: 5000,
                emit_events: false,
                emit_rtc_analytics: false,
                emit_interval: 1000,
            },
            conversations_page_config: {
                page_size: 10,
                order: 'asc',
                cursor: ''
            },
            events_page_config: {
                page_size: 10,
                order: 'asc',
                event_type: ''
            },
            enableEventsQueue: true,
            enableInboundOffer: false,
            token: null
        };
        this.config.socket_io.query = {
            token: '',
            SDK_version: this.config.SDK_version,
            session_version: '0.0.2',
            OS_family: 'js',
            OS_revision: (typeof navigator !== 'undefined') ? navigator.userAgent : (typeof window !== 'undefined') ? window.navigator.userAgent : 'Generic JS navigator'
        };
        this.sessionReady = false;
        this.session_id = null;
        this.apiKey = null;
        this.requests = {};
        this.application = null;
        /*
          Definitions of log levels
          error: major error messages, some lost functionality
          warn: error messages which do not cause a functional failure
          info: informational messages, showing completion, progress, etc.
          debug: messages to help in diagnosing a problem
        */
        if (['debug', 'info', 'warn', 'error'].includes(inputParams.debug)) {
            loglevel_1.default.setLevel(inputParams.debug);
        }
        else if (inputParams.debug === true) {
            loglevel_1.default.setLevel('debug');
        }
        else {
            loglevel_1.default.setLevel('silent');
        }
        this.log = loglevel_1.default.noConflict();
        // set our config from the inputParams
        this.config = utils_1.default.deepMergeObj(this.config, this._sanitizeConfig(inputParams));
        // inject bug reporting tool
        if (this.config.log_reporter.enabled) {
            const bugsnagConfig = {
                apiKey: this.config.log_reporter.bugsnag_key || utils_1.default._getBugsnagKey(),
                appVersion: this.config.socket_io.query.SDK_version,
                releaseStage: this.config.environment
            };
            global.NXMbugsnagClient = js_1.default(bugsnagConfig);
        }
        WildEmitter.mixin(NexmoClient);
    }
    /**
     * Creates and sets the socket_io connection
     *
     * @private
    */
    _createAndSetConnection() {
        let connection;
        // Create the socket.io connection and allow multiple instances
        let socket_io_config = Object.assign({ path: this.config.path }, this.config.socket_io);
        connection = socket_io_client_1.default.connect(this.config.url, socket_io_config);
        this.connection = connection;
        /**
         * Client listening for ready event.
         *
         * @event NexmoClient#ready
         * @example <caption>Listen for websocket ready event </caption>
         *     rtc.on("ready", () => {
         *      console.log("connection ready");
         *     });
        */
        connection.on('connect', () => {
            this.emit('ready');
            this.sessionReady = true;
            this.log.info('websocket ready');
        });
        // Listen to socket.io events
        /**
         * Client listening for connecting event.
         *
         * @event NexmoClient#connecting
         * @example <caption>Listen for websocket connecting event </caption>
         *     rtc.on("connecting", () => {
         *      console.log("connecting");
         *     });
        */
        connection.on('connecting', () => {
            this.emit('connecting');
            this.log.info('websocket connecting');
        });
        /**
         * Client listening for disconnect event.
         *
         * @event NexmoClient#disconnect
         * @example <caption>Listen for websocket disconnect event </caption>
         *     rtc.on("disconnect", () => {
         *      console.log("disconnect");
         *     });
        */
        connection.on('disconnect', (reason) => {
            this.emit('disconnect', (reason === "io client disconnect")
                ? NexmoClient.DISCONNECT_REASON.ClientDisconnected
                : (reason === "io server disconnect" && this.session_id) ? NexmoClient.DISCONNECT_REASON.TokenExpired
                    : NexmoClient.DISCONNECT_REASON.ConnectionError);
            this.log.info('websocket disconnected');
        });
        /**
         * Client listening for reconnect event.
         *
         * @event NexmoClient#reconnect
         * @example <caption>Listen for websocket reconnect event </caption>
         *     rtc.on("reconnect", (retry_number) => {
         *      console.log("reconnect", retry_number);
         *     });
        */
        connection.on('reconnect', (retry_number) => {
            this.emit('reconnect', retry_number);
            this.log.info('websocket reconnect');
        });
        /**
         * Client listening for reconnecting event.
         *
         * @event NexmoClient#reconnecting
         * @example <caption>Listen for websocket reconnecting event </caption>
         *     rtc.on("reconnecting", (retry_number): void => {
         *      console.log("reconnecting", retry_number);
         *     });
        */
        connection.on('reconnecting', (retry_number) => {
            this.emit('reconnecting', retry_number);
            this.log.info('websocket reconnecting');
        });
        /**
         * Client listening for error event.
         *
         * @event NexmoClient#error
         * @example <caption>Listen for websocket error event </caption>
         *     rtc.on("error", (error) => {
         *      console.log("error", error);
         *     });
        */
        connection.on('error', (error) => {
            this.emit('error', new nexmoClientError_1.NexmoClientError(error));
            this.log.error('Socket.io reported a generic error', error);
        });
        connection.on("reconnect_failed", () => {
            this.emit('error', new nexmoClientError_1.NexmoClientError("error:client:reconnection_failed"));
            this.log.error('websocket Reconnection error');
        });
        connection.io.on('packet', (packet) => {
            if (packet.type !== 2)
                return;
            if (packet.data[0] === 'echo')
                return; // ignore echo events
            const response = packet.data[1];
            // Set the type of the response
            response.type = packet.data[0];
            this.log.debug('<--', response.type, response);
            if (this.requests['session:login']) {
                const callback = this.requests['session:login'].callback;
                delete this.requests['session:login'];
                callback(response);
            }
            else if (response.rid in this.requests) {
                const callback = this.requests[response.rid].callback;
                delete this.requests[response.rid];
                delete response.delay;
                if (this.errorsEmitter) {
                    this.errorsEmitter.emitResponseIfError(response);
                }
                callback(response);
            }
            else {
                // This is an unsolicited event we emit it in application level
                // Excluding session:* events from being processed and check if event type is a system:error:* one
                if (this.errorsEmitter && response.type.startsWith('system:error:')) {
                    this.errorsEmitter.emitResponseIfError(response);
                }
                else if (response.type.startsWith('session:')) {
                    // Handle Events emitted from Reconnection
                    this.updateSession(response);
                }
                else if (this.application) {
                    this.application._enqueueEvent(response);
                }
            }
        });
        return connection;
    }
    /**
     * Revert any invalid params to our default
     *
     * @param {object} config the object to sanitize
     * @private
    */
    _sanitizeConfig(incomingConfig) {
        // make sure we allow specific values for the params
        // Sync
        let sanitizedConfig = incomingConfig;
        if (incomingConfig.sync && ['none', 'lite', 'full'].indexOf(incomingConfig.sync) === -1) {
            this.log.warn(`invalid param '${incomingConfig.sync}' for sync, reverting to ${this.config.sync}`);
            sanitizedConfig.sync = this.config.sync;
        }
        return sanitizedConfig;
    }
    /**
     * Conversation listening for text events.
     *
     * @event Conversation#text
     *
     * @property {Member} sender - The sender of the text
     * @property {TextEvent} text - The text message received
     * @example <caption>listen for text events</caption>
     *  conversation.on("text",(sender, message) => {
     *    console.log(sender, message);
     *    // Identify your own message.
     *    if (message.from === conversation.me.id){
     *        renderMyMessages(message)
     *    } else {
     *        renderOtherMessages(message)
     *    }
     *  });
     */
    /**
     *
     * Conversation listening for image events.
     *
     * @event Conversation#image
     *
     * @property {Member} sender - The sender of the image
     * @property {ImageEvent} image - The image message received
     * @example <caption>listen for image events</caption>
     *  conversation.on("image", (sender, image) => {
     *    console.log(sender,image);
     *    // Identify if your own imageEvent or someone else's.
     *    if (image.from !== conversation.me.id){
     *        displayImages(image);
     *    }
     *  });
     */
    /**
     * Conversation listening for deleted events.
     *
     * @event Conversation#event:delete
     *
     * @property {Member} member - the Member who deleted an event
     * @property {NXMEvent} event - deleted event: event.id
     * @example <caption>get details about the deleted event</caption>
     * conversation.on("event:delete", (member, event) => {
     *  console.log(event.id);
     *  console.log(event.body.timestamp.deleted);
     * });
     */
    /**
     * Conversation listening for new Members.
     *
     * @event Conversation#member:joined
     *
     * @property {Member} member - the Member that joined
     * @property {NXMEvent} event - the join event
     * @example <caption>get the name of the new Member</caption>
     * conversation.on("member:joined", (member, event) => {
     *  console.log(event.id)
     *  console.log(member.userName+ " joined the conversation");
     * });
     */
    /**
     * Conversation listening for Members being invited.
     *
     * @event Conversation#member:invited
     *
     * @property {Member} member - the Member that is invited
     * @property {NXMEvent} event - data regarding the receiver of the invitation
     * @example <caption>get the name of the invited Member</caption>
     * conversation.on("member:invited", (member, event) => {
     *  console.log(member.userName + " invited to the conversation");
     * });
     */
    /**
     * Conversation listening for Members callStatus changes.
     *
     * @event Conversation#member:call:status
     *
     * @property {Member} member - the Member that has left
     * @example <caption>get the callStatus of the member that changed call status</caption>
     * conversation.on("member:call:status", (member) => {
     *  console.log(member.callStatus);
     * });
     */
    /**
     * Conversation listening for Members leaving (kicked or left).
     *
     * @event Conversation#member:left
     *
     * @property {Member} member - the Member that has left
     * @property {NXMEvent} event - data regarding the receiver of the invitation
     * @example <caption>get the username of the Member that left</caption>
     * conversation.on("member:left", (member , event) => {
     *  console.log(member.userName + " left");
     *  console.log(event.body.reason);
     * });
     */
    /**
     * Conversation listening for Members typing.
     *
     * @event Conversation#text:typing:on
     *
     * @property {Member} member - the member that started typing
     * @property {NXMEvent} event - the start typing event
     * @example <caption>get the display name of the Member that is typing</caption>
     * conversation.on("text:typing:on", (member, event) => {
     *  console.log(member.displayName + " is typing...");
     * });
     */
    /**
     * Conversation listening for Members stopped typing.
     *
     * @event Conversation#text:typing:off
     *
     * @property {Member} member - the member that stopped typing
     * @property {NXMEvent} event - the stop typing event
     * @example <caption>get the display name of the Member that stopped typing</caption>
     * conversation.on("text:typing:off", (member, event) => {
     *  console.log(member.displayName + " stopped typing...");
     * });
     */
    /**
     * Conversation listening for Members' seen texts.
     *
     * @event Conversation#text:seen
     *
     * @property {Member} member - the Member that saw the text
     * @property {TextEvent} text - the text that was seen
     * @example <caption>listen for seen text events</caption>
     * conversation.on("text:seen", (member, text) => {
     *  console.log(text);
     *  if (conversation.me.id !== member.memberId) {
     *    console.log(member);
     *  }
     * });
     */
    /**
     * Conversation listening for Members' seen images.
     * @event Conversation#image:seen
     *
     * @property {Member} member - the member that saw the image
     * @property {ImageEvent} image - the image that was seen
     * @example <caption>listen for seen image events</caption>
     * conversation.on("image:seen", (member, image) => {
     *  console.log(image);
     *  if (conversation.me.id !== member.memberId) {
     *    console.log(member);
     *  };
     * });
     */
    /**
     * Conversation listening for Members submitted messages.
     * @event Conversation#message:submitted
     *
     * @property {Member} member - the member that message was submitted to
     * @property {MessageEvent} message - the message that was submitted
     * @example <caption>listen for submitted message events</caption>
     * conversation.on("message:submitted", (member, message) => {
     *  console.log(message);
     *  if (conversation.me.id !== member.memberId) {
     *    console.log(member);
     *  };
     * });
     */
    /**
     * Conversation listening for Members rejected messages.
     * @event Conversation#message:rejected
     *
     * @property {Member} member - the member that message was rejected by
     * @property {MessageEvent} message - the message that was rejected
     * @example <caption>listen for rejected message events</caption>
     * conversation.on("message:rejected", (member, message) => {
     *  console.log(message);
     *  if (conversation.me.id !== member.memberId) {
     *    console.log(member);
     *  };
     * });
     */
    /**
     * Conversation listening for Members undeliverable messages.
     * @event Conversation#message:undeliverable
     *
     * @property {Member} member - the member that message was undeliverable to
     * @property {MessageEvent} message - the message that was undeliverable
     * @example <caption>listen for undeliverable message events</caption>
     * conversation.on("message:undeliverable", (member, message) => {
     *  console.log(message);
     *  if (conversation.me.id !== member.memberId) {
     *    console.log(member);
     *  };
     * });
     */
    /**
     * Conversation listening for Members delivered messages.
     * @event Conversation#message:delivered
     *
     * @property {Member} member - the member that message was delivered to
     * @property {MessageEvent} message - the message that was delivered
     * @example <caption>listen for delivered message events</caption>
     * conversation.on("message:delivered", (member, message) => {
     *  console.log(message);
     *  if (conversation.me.id !== member.memberId) {
     *    console.log(member);
     *  };
     * });
     */
    /**
     * Conversation listening for Members seen messages.
     * @event Conversation#message:seen
     *
     * @property {Member} member - the member that message was seen by
     * @property {MessageEvent} message - the message that was seen
     * @example <caption>listen for seen message events</caption>
     * conversation.on("message:seen", (member, message) => {
     *  console.log(message);
     *  if (conversation.me.id !== member.memberId) {
     *    console.log(member);
     *  };
     * });
     */
    /**
     * Conversation listening for Members media changes (audio,text)
     *
     * Change in media presence state. They are in the Conversation with text or audio.
     *
     * @event Conversation#member:media
     *
     * @property {Member} member - the Member object linked to this event
     * @property {NXMEvent} event - information about media presence state
     * @property {boolean} event.body.audio  - is audio enabled
     * @example <caption>get every Member's media change events </caption>
     * conversation.on("member:media", (member, event) => {
     *  console.log(event.body.media); //{"audio": true, "audio_settings": {"enabled": true, "muted": false, "earmuffed": false}}
     * });
     */
    /**
     * Conversation listening for mute on events
     * A Member has muted their audio
     *
     * @event Conversation#audio:mute:on
     *
     * @property {Member} member - the Member object linked to this event
     * @property {NXMEvent} event - information about the mute event
     * @example <caption>listen for audio mute on events </caption>
     * conversation.on("audio:mute:on", (member, event) => {
     *  console.log("member that is muted ", member);
     *  console.log(event);
     * });
     */
    /**
     * Conversation listening for mute off events
     * A member has unmuted their audio
     *
     * @event Conversation#audio:mute:off
     *
     * @property {Member} member - the member object linked to this event
     * @property {NXMEvent} event - information about the mute event
     * @example <caption>listen for audio mute off events </caption>
     * conversation.on("audio:mute:off", (member, event) => {
     *  console.log("member that is unmuted ", member);
     *  console.log(event);
     * });
     */
    sendRequest(request, callback) {
        // Add a message ID to the request and set up a listener for the reply (or error)
        request.tid = utils_1.default.allocateUUID();
        const type = request.type;
        delete request.type;
        this.log.debug('-->', type, request);
        this.log.info('-->', type, request.tid);
        this.connection.emit(type, request);
        this.requests[request.tid] = {
            type: type,
            request,
            callback
        };
    }
    async sendNetworkRequest(params) {
        const version = params.version || 'beta';
        const url = `${this.config.nexmo_api_url}/${version}/${params.path}`;
        if (!(params.type === 'GET' || params.type === 'DELETE')) {
            if (params.data) {
                params.data.originating_session = this.session_id;
            }
            else {
                params.data = {
                    originating_session: this.session_id
                };
            }
        }
        try {
            const request = {
                type: params.type,
                url,
                data: (params.data) ? params.data : null,
                token: (params.data || {}).token ? params.data.token : this.config.token || null
            };
            this.log.debug('sendNetworkRequest: ', { request });
            const { response } = await utils_1.default.networkRequest(request);
            return response;
        }
        catch ({ response }) {
            throw response;
        }
    }
    /**
     * Create a new Session.
     * @param {string} token - the user JSON Web Token (JWT)
     * @returns  {Promise<Application>} - the application logged in to
     * @example <caption>Create a session and return the Application</caption>
     *  rtc.createSession(token).then((application) => {
     *    console.log(application);
     *  }).catch((error) => {
     *    console.log(error);
     *  });
    */
    createSession(token) {
        this.config.socket_io.query.token = token;
        this._createAndSetConnection();
        // return a promise for the application
        return new Promise((resolve, reject) => {
            this.log.info(`Client-SDK Version: ${this.config.SDK_version}`);
            this.config.token = null;
            this.requests['session:login'] = {
                type: 'session:login',
                callback: async (response) => {
                    if (response.type === 'session:success') {
                        this.session_id = response.body.id;
                        this.apiKey = response.body.api_key;
                        // Store token in config
                        this.config.token = token;
                        // adds the session id as a query parameter in order to
                        // connect to the same session in case of a reconnection
                        this.connection.io.opts.query = {
                            session_id: this.session_id,
                            token: this.config.token
                        };
                        if (!this.application || (this.application.me && this.application.me.id !== response.body.user_id)) {
                            this.application = new application_1.default(this, {});
                        }
                        if (!this.application.me) {
                            this.application.me = new user_1.default(this.application, {
                                id: response.body.user_id,
                                name: response.body.name
                            });
                        }
                        if (!this.errorsEmitter) {
                            this.errorsEmitter = new errors_emitter_1.default(this.application);
                        }
                        // Set Bugsnag user to application.me.id
                        if (this.config.log_reporter.enabled) {
                            global.NXMbugsnagClient.user = {
                                id: this.application.me.id,
                                name: this.application.me.name,
                                session_id: response.body.id
                            };
                        }
                        if (this.config.sync !== 'none') {
                            // Retrieve the existing conversation data for this user
                            try {
                                await this.application.getConversations();
                                resolve(this.application);
                            }
                            catch (error) {
                                reject(error);
                            }
                        }
                        else {
                            resolve(this.application);
                        }
                    }
                    else {
                        reject(new nexmoClientError_1.NexmoApiError(response));
                    }
                }
            };
        });
    }
    /**
     * Delete existing Session.
     * @returns  {Promise<CAPIResponse>} - response with rid and type
     * @example <caption>Delete existing session</caption>
     *  rtc.deleteSession().then((response) => {
     *    console.log(response);
     *  }).catch((error) => {
     *    console.log(error);
     *  });
    */
    deleteSession() {
        return new Promise(async (resolve, reject) => {
            const logoutRequest = () => {
                return this.sendRequest({
                    type: 'session:logout',
                    body: {}
                }, (response) => {
                    if (response.type === 'session:logged-out' || response.type === 'session:terminated') {
                        this.disconnect();
                        delete this.errorsEmitter;
                        delete this.application;
                        delete this.connection;
                        this.requests = {};
                        this.sessionReady = false;
                        resolve(response);
                    }
                    else {
                        reject(response);
                    }
                });
            };
            // prepare for deleteSession
            if (this.application) {
                let disablePromises = [];
                if (this.application.conversations.size) {
                    for (let conversation of this.application.conversations.values()) {
                        disablePromises.push(conversation.media.disable());
                    }
                }
                try {
                    await Promise.all(disablePromises);
                }
                catch (error) {
                    this.log.error("deleteSession: ", error);
                }
                return logoutRequest();
            }
            else {
                return logoutRequest();
            }
        });
    }
    updateSession(event) {
        if (event.type === 'session:success') {
            this.session_id = event.body.id;
            this.connection.io.opts.query.session_id = event.body.id;
        }
    }
    /**
     * Disconnect from the cloud.
     *
    */
    disconnect() {
        return this.connection.disconnect();
    }
    /**
     * Connect to the cloud.
     *
    */
    connect() {
        return this.connection.connect();
    }
    /**
       * Get a connectivity report for all Vonage DCs and Media Servers.
     * @param {string} token - the JSON Web Token (JWT)
     * @param {object} options - configure the connectivityReport
     * @param {Function} options.dcListCallback - a callback function to edit the list of datacenters before connectivity checks
       * @returns  {Promise<Report>}
       * @example <caption>Get a connectivity report</caption>
     *
       *  rtc.connectivityReport(token, {
     *    dcListCallback: (dcList) => {...dcList, additionalDc}
     *  }).then((report) => {
     *    console.log(report);
     *  }).catch((error) => {
     *    console.log(error);
     *  });
    */
    async connectivityReport(token, options) {
        var _a;
        const ip = !rtc_helper_1.default.isNode() ? await publicip_1.default.v4() : undefined;
        const report = {
            machineInfo: { ip },
            connectivityReport: []
        };
        try {
            const { response } = await utils_1.default.networkRequest({
                type: 'GET',
                url: `${this.config.nexmo_api_url}/v0.3/discovery/api`,
                token
            });
            let dcList = response;
            if ((_a = options) === null || _a === void 0 ? void 0 : _a.dcListCallback) {
                dcList = options.dcListCallback(dcList);
            }
            for (const dc in dcList) {
                const endpoint = dcList[dc].endpoint;
                const apiUrl = dcList[dc].https;
                const wsUrl = dcList[dc].ws;
                try {
                    const httpRes = await utils_1.default._checkHttpConnectivity(apiUrl);
                    const wsRes = await utils_1.default._checkWsConnectivity(wsUrl, this.config.path, this.config.socket_io);
                    const mediaConnectionReport = await utils_1.default._checkMediaServers(token, endpoint, dc);
                    const rep = {
                        name: dc,
                        signalConnectionReport: {
                            https: httpRes,
                            ws: wsRes,
                        },
                        mediaConnectionReport
                    };
                    report.connectivityReport.push(rep);
                }
                catch (error) {
                    this.log.error(`Error generating report for ${dc}`, error);
                }
            }
        }
        catch (error) {
            this.log.error(`Error fetching nexmo servers information`, error);
        }
        return report;
    }
    /**
      * Return a list with the connection health of the media servers for a specific datacenter.
      * @returns  {Promise<MediaConnectionReport[]>}
    * @param {string} token - the JSON Web Token (JWT)
    * @param {string} nexmo_api_url - url of the nexmo api to be called
    * @param {string} datacenter - datacenter of interest
      * @example <caption>Return a list with the connection health of the media servers</caption>
    *
      *  rtc.checkMediaServers('nexmo-api-url','dc').then((responseArray) => {
      *    console.log(responseArray);
      *  }).catch((error) => {
      *    console.log(error);
      *  });
     */
    async checkMediaServers(token, nexmo_api_url, datacenter) {
        return await utils_1.default._checkMediaServers(token, nexmo_api_url, datacenter);
    }
    /**
    * Return the connection health of a single media server including possible connectionTime in ms.
    * @returns  {Promise<MediaConnectionReport>}
    * @param {string} ip - ip address of the Media Server
    * @param {string} port - port number of the Media Server
    * @example <caption>Return the connection health of a single media server</caption>
    *
    *  rtc.checkMediaConnectivity('ip-address','1').then((response) => {
    *    console.log(`IP Address of media server: ${response.ip}`);
    *    console.log(`Able to connect: ${response.canConnect}`);
    *    console.log(`ConnectionTime in ms: ${resonse.connectionTime}`);
    *  }).catch((error) => {
    *    console.log(error);
    *  });
   */
    async checkMediaConnectivity(ip, port) {
        return await utils_1.default._checkMediaConnectivity(ip, port);
    }
}
exports.default = NexmoClient;
/**
 * Enum for NexmoClient disconnection reason.
 * @readonly
 * @enum {string}
 * @alias NexmoClient.DISCONNECT_REASON
*/
NexmoClient.DISCONNECT_REASON = {
    ClientDisconnected: 'ClientDisconnected',
    TokenExpired: 'TokenExpired',
    ConnectionError: 'ConnectionError'
};
module.exports = NexmoClient;
