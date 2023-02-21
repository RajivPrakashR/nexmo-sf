'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Nexmo Client SDK
 *  Application Object Model
 *
 * Copyright (c) Nexmo Inc.
*/
const WildEmitter = require('wildemitter');
const loglevel_1 = require("loglevel");
const nexmoClientError_1 = require("./nexmoClientError");
const user_1 = __importDefault(require("./user"));
const conversation_1 = __importDefault(require("./conversation"));
const nxmCall_1 = __importDefault(require("./modules/nxmCall"));
const sip_events_1 = __importDefault(require("./handlers/sip_events"));
const rtc_events_1 = __importDefault(require("./handlers/rtc_events"));
const application_events_1 = __importDefault(require("./handlers/application_events"));
const utils_1 = __importDefault(require("./utils"));
const page_config_1 = __importDefault(require("./pages/page_config"));
const conversations_page_1 = __importDefault(require("./pages/conversations_page"));
const user_sessions_page_1 = __importDefault(require("./pages/user_sessions_page"));
const events_queue_1 = require("./handlers/events_queue");
const member_1 = __importDefault(require("./member"));
let sipEventHandler = null;
let rtcEventHandler = null;
let applicationEventsHandler = null;
/**
 * Core application class for the SDK.
 * Application is the parent object holding the list of conversations, the session object.
 * Provides methods to create conversations and retrieve a list of the user's conversations, while it holds the listeners for
 * user's invitations
 * @class Application
 * @param {NexmoClient} SDK session Object
 * @param {object} params
 * @example <caption>Accessing the list of conversations</caption>
 *  rtc.createSession(token).then((application) => {
 *    console.log(application.conversations);
 *    console.log(application.me.name, application.me.id);
 *  }).catch((error) => {
 *    console.error(error);
 *  });
 * @emits Application#member:invited
 * @emits Application#member:joined
 * @emits Application#NXM-errors
 * @emits Application#rtcstats:analytics
*/
class Application {
    constructor(session, params) {
        this.log = loglevel_1.getLogger(this.constructor.name);
        this.session = session;
        this.conversations = new Map();
        this.synced_conversations_count = 0;
        this.start_sync_time = 0;
        this.stop_sync_time = 0;
        // conversation_id, nxmCall
        this.calls = new Map();
        // knocking_id, nxmCall
        this._call_draft_list = new Map();
        this.pageConfig = new page_config_1.default((session.config || {}).conversations_page_config);
        this.conversations_page_last = null;
        this.activeStreams = [];
        sipEventHandler = new sip_events_1.default(this);
        rtcEventHandler = new rtc_events_1.default(this);
        applicationEventsHandler = new application_events_1.default(this);
        this.me = null;
        Object.assign(this, params);
        WildEmitter.mixin(Application);
    }
    /**
     * Update Conversation instance or create a new one.
     *
     * Pre-created conversation exist from getConversations
     * like initialised templates. When we explicitly ask to
     * getConversation(), we receive members and other details
     *
     * @param {object} payload Conversation payload
     * @private
    */
    updateOrCreateConversation(payload) {
        const conversation = this.conversations.get(payload.id);
        if (conversation) {
            conversation._updateObjectInstance(payload);
            this.conversations.set(payload.id, conversation);
        }
        else {
            this.conversations.set(payload.id, new conversation_1.default(this, payload));
        }
        return this.conversations.get(payload.id);
    }
    /**
     * Application listening for member invited events.
     *
     * @event Application#member:invited
     *
     * @property {Member} member - The invited member
     * @property {NXMEvent} event - The invitation event
     *
     * @example <caption>listen for member invited events on Application level</caption>
     *  application.on("member:invited",(member, event) => {
     *    console.log("Invited to the conversation: " + event.conversation.display_name || event.conversation.name);
     *    // identify the sender.
     *    console.log("Invited by: " + member.invited_by);
     *    //accept an invitation.
     *    application.conversations.get(event.conversation.id).join();
     *    //decline the invitation.
     *     application.conversations.get(event.conversation.id).leave();
     *  });
    */
    /**
     * Application listening for member joined events.
     *
     * @event Application#member:joined
     *
     * @property {Member} member - the member that joined the conversation
     * @property {NXMEvent} event - the join event
     *
     * @example <caption>listen for member joined events on Application level</caption>
     *  application.on("member:joined",(member, event) => {
     *    console.log("JOINED", "Joined conversation: " + event.conversation.display_name || event.conversation.name);
     *  });
  */
    /**
       * Entry point for queing events in Application level
       * @private
    */
    async _enqueueEvent(response) {
        if (this.session.config.enableEventsQueue) {
            if (!this.eventsQueue) {
                this.eventsQueue = new events_queue_1.EventsQueue((event) => this._handleEvent(event));
            }
            this.eventsQueue.enqueue(response, this);
        }
        else {
            this._handleEvent(response);
        }
    }
    /**
     * Entry point for events in Application level
     * @private
    */
    async _handleEvent(event) {
        var _a, _b, _c, _d, _e, _f, _g;
        const isEventFromMe = ((_a = event._embedded) === null || _a === void 0 ? void 0 : _a.from_user) ? ((_c = (_b = event._embedded) === null || _b === void 0 ? void 0 : _b.from_user) === null || _c === void 0 ? void 0 : _c.id) === ((_d = this.me) === null || _d === void 0 ? void 0 : _d.id)
            : ((_f = (_e = event.body) === null || _e === void 0 ? void 0 : _e.user) === null || _f === void 0 ? void 0 : _f.user_id) === ((_g = this.me) === null || _g === void 0 ? void 0 : _g.id);
        // check if user is already part of the conversation and if it has a member on a valid
        // state (INVITED, JOINED) otherwise user is being re-invited and we need to fetch the
        // conversation and members info again
        const isUserReInvited = utils_1.default._checkIfUserIsReInvited(this.conversations, event);
        if (event.type.startsWith('sip')) {
            sipEventHandler._handleSipCallEvent(event);
            return event;
        }
        if (this.conversations.has(event.cid) && event.type !== "rtc:transfer" && !isUserReInvited) {
            if (event.type.startsWith('rtc')) {
                rtcEventHandler._handleRtcEvent(event);
            }
            this.conversations.get(event.cid)._handleEvent(event);
            if ((event.type === 'member:joined' || event.type === 'member:invited') && isEventFromMe) {
                this._handleApplicationEvent(event);
            }
            return event;
        }
        else {
            // if event has cid get the conversation you don't know about (case: joined by another user)
            if (event.cid) {
                try {
                    if (isUserReInvited)
                        this.conversations.delete(event.cid);
                    let conversation;
                    if (utils_1.default._isCallEvent(event)) {
                        conversation = await this.getConversation(event.cid, Application.CONVERSATION_API_VERSION.v1);
                    }
                    else {
                        conversation = await this.getConversation(event.cid, Application.CONVERSATION_API_VERSION.v3);
                    }
                    this.conversations.set(event.cid, conversation);
                    await conversation._handleEvent(event);
                    await this._handleApplicationEvent(event);
                    if (event.type.startsWith("rtc")) {
                        rtcEventHandler._handleRtcEvent(event);
                    }
                    return Promise.resolve(event);
                }
                catch (error) {
                    this.log.error(error);
                    return Promise.reject(error);
                }
            }
        }
    }
    /**
     * Update user's token that was generated when they were first authenticated.
     * @param {string} token - the new token
     * @returns {Promise}
   * @example <caption>listen for expired-token error events and then update the token on Application level</caption>
   * application.on('system:error:expired-token', 'NXM-errors', (error) => {
   * 	console.log('token expired');
   * 	application.updateToken(token);
   * });
  */
    async updateToken(token) {
        // SDK can be disconnected because of expired token
        // this lets us update token for next reconnection attempt
        if (this.session.connection && this.session.connection.disconnected) {
            this.session.config.token = token;
            this.session.connection.io.opts.query.token = token;
            return Promise.resolve();
        }
        const reqObj = {
            url: `${this.session.config.nexmo_api_url}/v0.2/sessions/${this.session.session_id}`,
            type: 'PUT',
            token
        };
        try {
            await utils_1.default.networkRequest(reqObj);
            if (this.me) {
                this.session.config.token = token;
                this.session.connection.io.opts.query.token = token;
            }
        }
        catch (error) {
            throw (new nexmoClientError_1.NexmoApiError(error));
        }
    }
    /**
     * Update the event to map local generated events
     * in case we need a more specific event to pass in the application listener
     * or f/w the event as it comes
     * @private
    */
    async _handleApplicationEvent(event) {
        try {
            this.log.debug("_handleApplicationEvent: ", { event });
            const processed_event = applicationEventsHandler.handleEvent(event);
            const conversation = this.conversations.get(event.cid);
            let member;
            if (conversation.members.has((processed_event || {}).from)) {
                member = conversation.members.get(processed_event.from);
            }
            else if (event.type === 'member:joined' || event.type === 'member:invited') {
                const params = { ...event.body, ...(event.from && { member_id: event.from }) };
                member = new member_1.default(conversation, params);
            }
            else {
                try {
                    member = await conversation.getMember(processed_event.from);
                }
                catch (error) {
                    this.log.warn(`There is an error getting the member ${error}`);
                }
            }
            this.emit(processed_event.type, member, processed_event);
            return event;
        }
        catch (e) {
            this.log.error("_handleApplicationEvent: ", e);
            throw (e);
        }
    }
    /**
     * Creates a call to specified user/s.
     * @classdesc creates a call between the defined users
     * @param {string[]} usernames - the user names for those we want to call
     * @returns {Promise<NXMCall>} a NXMCall object with all the call properties
     * @example <caption>Create a call with users</caption>
     *  application.on("call:status:changed", (nxmCall) => {
     *    if (nxmCall.status === nxmCall.CALL_STATUS.STARTED) {
     *		  console.log('the call has started');
     *		}
     *  });
     *
     *  application.inAppCall(usernames).then(() => {
     *    console.log('Calling user(s)...');
     *  }).catch((error) => {
     *    console.error(error);
     *  });
    */
    async inAppCall(usernames) {
        if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
            return Promise.reject(new nexmoClientError_1.NexmoClientError('error:application:call:params'));
        }
        try {
            const nxmCall = new nxmCall_1.default(this);
            await nxmCall.createCall(usernames);
            nxmCall.direction = nxmCall.CALL_DIRECTION.OUTBOUND;
            return nxmCall;
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Creates a call to phone a number.
     * The call object is created under application.calls when the call has started.
     * listen for it with application.on("call:status:changed")
     *
     * You don't need to start the stream, the SDK will play the audio for you
     *
     * @classdesc creates a call to a phone number
   * @param {string} user the phone number or the username you want to call
   * @param {string} [type="phone"] the type of the call you want to have. possible values "phone" or "app" (default is "phone")
   * @param {object} [custom_data] custom data to be included in the call object, i.e. { yourCustomKey: yourCustomValue }
     * @returns {Promise<NXMCall>}
     * @example <caption>Create a call to a phone</caption>
     *  application.on("call:status:changed", (nxmCall) => {
     *    if (nxmCall.status === nxmCall.CALL_STATUS.STARTED) {
     *		  console.log('the call has started');
   *		}
   *  });
   *
     *  application.callServer(phone_number).then((nxmCall) => {
     *    console.log('Calling phone ' + phone_number);
   *    console.log('Call Object ': nxmCall);
     *  }).catch((error) => {
   *    console.error(error);
   *  });
    */
    async callServer(user, type = 'phone', custom_data = {}) {
        try {
            const nxmCall = new nxmCall_1.default(this);
            nxmCall.direction = nxmCall.CALL_DIRECTION.OUTBOUND;
            await nxmCall.createServerCall(user, type, custom_data);
            return nxmCall;
        }
        catch (error) {
            throw error;
        }
    }
    /**
       * Reconnect a leg to an ongoing call.
       * You don't need to start the stream, the SDK will play the audio for you
       *
       * @classdesc reconnect leg to an ongoing call
     * @param {string} conversation_id the conversation that you want to reconnect
     * @param {string} rtc_id the id of the leg that will be reconnected
     * @param {object} [mediaParams] - MediaStream params (same as Media.enable())
       * @returns {Promise<NXMCall>}
       * @example <caption>Reconnect a leg to an ongoing call</caption>
       *  application.reconnectCall("conversation_id", "rtc_id").then((nxmCall) => {
       *    console.log(nxmCall);
       *  }).catch((error) => {
     *    console.error(error);
     *  });
     *
     * @example <caption>Reconnect a leg to an ongoing call without auto playing audio</caption>
       *  application.reconnectCall("conversation_id", "rtc_id", { autoPlayAudio: false }).then((nxmCall) => {
       *    console.log(nxmCall);
       *  }).catch((error) => {
     *    console.error(error);
     *  });
     *
     * @example <caption>Reconnect a leg to an ongoing call choosing device ID</caption>
       *  application.reconnectCall("conversation_id", "rtc_id", { audioConstraints: { deviceId: "device_id" } }).then((nxmCall) => {
       *    console.log(nxmCall);
       *  }).catch((error) => {
     *    console.error(error);
     *  });
      */
    async reconnectCall(conversationId, rtcId, mediaParams = {}) {
        try {
            if (!conversationId || !rtcId) {
                throw new nexmoClientError_1.NexmoClientError('error:missing:params');
            }
            const conversation = await this.getConversation(conversationId, Application.CONVERSATION_API_VERSION.v1);
            await conversation.media.enable({ ...mediaParams, reconnectRtcId: rtcId });
            const nxmCall = new nxmCall_1.default(this, conversation);
            // assigning the correct call status taking into account the sip status (outbound)
            // on inbound calls the reconnect will happen after the call is estabilished and both legs are answered
            const event_types = Array.from(conversation.events.values()).map(event => event.type);
            if (event_types.includes('sip:answered'))
                nxmCall.status = nxmCall.CALL_STATUS.ANSWERED;
            else if (event_types.includes('sip:ringing'))
                nxmCall.status = nxmCall.CALL_STATUS.RINGING;
            else
                nxmCall.status = nxmCall.CALL_STATUS.STARTED;
            nxmCall.rtcObjects = conversation.media.rtcObjects;
            this.calls.set(conversation.id, nxmCall);
            return nxmCall;
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Query the service to create a new conversation
     * The conversation name must be unique per application.
     * @param {object} [params] - leave empty to get a GUID as name
     * @param {string} params.name - the name of the conversation. A UID will be assigned if this is skipped
     * @param {string} params.display_name - the display_name of the conversation.
     * @returns {Promise<Conversation>} - the created Conversation
     * @example <caption>Create a conversation and join</caption>
     *  application.newConversation().then((conversation) => {
     *    //join the created conversation
     *    conversation.join().then((member) => {
     *      //Get the user's member belonging in this conversation.
     *      //You can also access it via conversation.me
     *      console.log("Joined as " + member.user.name);
   *    });
     *  }).catch((error) => {
     *    console.error(error);
     *  });
    */
    async newConversation(data = {}) {
        try {
            const response = await this.session.sendNetworkRequest({
                type: 'POST',
                path: 'conversations',
                data
            });
            const conv = new conversation_1.default(this, response);
            this.conversations.set(conv.id, conv);
            // do a get conversation to get the whole model as shaped in the service,
            return this.getConversation(conv.id, Application.CONVERSATION_API_VERSION.v1);
        }
        catch (error) {
            throw new nexmoClientError_1.NexmoApiError(error);
        }
    }
    /**
     * Query the service to create a new conversation and join it
     * The conversation name must be unique per application.
     * @param {object} [params] - leave empty to get a GUID as name
     * @param {string} params.name - the name of the conversation. A UID will be assigned if this is skipped
     * @param {string} params.display_name - the display_name of the conversation.
     * @returns {Promise<Conversation>} - the created Conversation
     * @example <caption>Create a conversation and join</caption>
     *  application.newConversationAndJoin().then((conversation) => {
     *    console.log("Joined as " + conversation.me.display_name);
     *  }).catch((error) => {
     *    console.error("Error creating a conversation and joining ", error);
     *  });
    */
    async newConversationAndJoin(params) {
        const conversation = await this.newConversation(params);
        await conversation.join();
        return conversation;
    }
    /**
     * Query the service to see if this conversation exists with the
     * logged in user as a member and retrieve the data object
     * Result added (or updated) in this.conversations
     *
     * @param {string} id - the id of the conversation to fetch
   * @param {string} version=Application.CONVERSATION_API_VERSION.v3 {Application.CONVERSATION_API_VERSION.v1 || Application.CONVERSATION_API_VERSION.v3} - the version of the Conversation Service API to use (v1 includes the full list of the members of the conversation but v3 does not)
     * @returns {Promise<Conversation>} - the requested conversation
     * @example <caption>Get a conversation</caption>
     *  application.getConversation(id).then((conversation) => {
     *      console.log("Retrieved conversation: ", conversation);
     *  }).catch((error) => {
     *    console.error(error);
     *  });
    */
    async getConversation(id, version = Application.CONVERSATION_API_VERSION.v3) {
        if (version !== Application.CONVERSATION_API_VERSION.v1 && version !== Application.CONVERSATION_API_VERSION.v3) {
            throw new nexmoClientError_1.NexmoClientError('error:conversation-service:version');
        }
        let response;
        if (version === Application.CONVERSATION_API_VERSION.v1) {
            try {
                response = await this.session.sendNetworkRequest({
                    type: 'GET',
                    path: `conversations/${id}`
                });
                response['id'] = response['uuid'];
                delete response['uuid'];
            }
            catch (error) {
                throw new nexmoClientError_1.NexmoApiError(error);
            }
        }
        else {
            try {
                response = await this.session.sendNetworkRequest({
                    type: 'GET',
                    path: `conversations/${id}`,
                    version: 'v0.3'
                });
            }
            catch (error) {
                throw new nexmoClientError_1.NexmoApiError(error);
            }
        }
        const conversation_object = this.updateOrCreateConversation(response);
        if (version === Application.CONVERSATION_API_VERSION.v3 && !conversation_object.me) {
            try {
                const member = await conversation_object.getMyMember();
                conversation_object.me = member;
                conversation_object.members.set(member.id, member);
            }
            catch (error) {
                // add a retry in case of a failure in fetching the member
                try {
                    const member = await conversation_object.getMyMember();
                    conversation_object.me = member;
                    conversation_object.members.set(member.id, member);
                }
                catch (error) {
                    this.log.warn(`You don't have any membership in ${conversation_object.id}`);
                }
            }
        }
        if (this.session.config.sync === 'full') {
            // Populate the events
            const { items } = await conversation_object.getEvents();
            conversation_object.events = items;
            return conversation_object;
        }
        else {
            return conversation_object;
        }
    }
    /**
     * Query the service to obtain a complete list of conversations of which the
     * logged-in user is a member with a state of `JOINED` or `INVITED`.
   * @param {object} params configure defaults for paginated conversations query
   * @param {string} params.order 'asc' or 'desc' ordering of resources based on creation time
   * @param {number} params.page_size the number of resources returned in a single request list
   * @param {string} [params.cursor] string to access the starting point of a dataset
     *
     * @returns {Promise<Page<Map<Conversation>>>} - Populate Application.conversations.
   * @example <caption>Get Conversations</caption>
   *  application.getConversations({ page_size: 20 }).then((conversations_page) => {
   *    conversations_page.items.forEach(conversation => {
   *      render(conversation)
   *    })
   *  }).catch((error) => {
   *      console.error(error);
   *  });
   *
    */
    async getConversations(params = {}) {
        const url = `${this.session.config.nexmo_api_url}/beta2/users/${this.me.id}/conversations`;
        // Create pageConfig if some elements given otherwise use default
        let pageConfig = Object.keys(params).length === 0 ? this.pageConfig : new page_config_1.default(params);
        try {
            const response = await utils_1.default.paginationRequest(url, pageConfig, this.session.config.token);
            response.application = this;
            const conversations_page = new conversations_page_1.default(response);
            this.conversations_page_last = conversations_page;
            return conversations_page;
        }
        catch (error) {
            throw new nexmoClientError_1.NexmoApiError(error);
        }
    }
    /**
     * Application listening for sync status events.
     *
     * @event Application#sync:progress
     *
     * @property {number} status.sync_progress - Percentage of fetched conversations
     * @example <caption>listen for changes in the synchronisation progress events on Application level</caption>
     *  application.on("sync:progress",(status) => {
     *	  console.log(status.sync_progress);
     *  });
    */
    /**
     * Fetching all the conversations and sync progress events
    */
    syncConversations(conversations) {
        const conversation_array = Array.from(conversations.values());
        const conversations_length = conversation_array.length;
        const d = new Date();
        this.start_sync_time = (typeof window !== 'undefined' && window.performance) ? window.performance.now() : d.getTime();
        const fetchConversationForStorage = async () => {
            this.synced_conversations_percentage = Number(((this.synced_conversations_count / conversations_length) * 100).toFixed(2));
            const status_payload = {
                sync_progress: this.synced_conversations_percentage
            };
            this.emit('sync:progress', status_payload);
            this.log.info('Loading sync progress: ' + this.synced_conversations_count + '/' +
                conversations_length + ' - ' + this.synced_conversations_percentage + '%');
            if (this.synced_conversations_percentage >= 100) {
                const d = new Date();
                this.stop_sync_time = (typeof window !== 'undefined' && window.performance) ? window.performance.now() : d.getTime();
                this.log.info('Loaded conversations in ' + (this.stop_sync_time - this.start_sync_time) + 'ms');
            }
            if (this.synced_conversations_count < conversations_length) {
                await this.getConversation(conversation_array[this.synced_conversations_count].id);
                fetchConversationForStorage();
                this.synced_conversations_count++;
                this.sync_progress_buffer++;
            }
        };
        fetchConversationForStorage();
    }
    /**
     * Get Details of a user by using their id. If no id is present, will return your own user details.
     * @param {string} id - the id of the user to fetch, if skipped, it returns your own user details
     * @returns {Promise<User>}
     * @example <caption>Get User details</caption>
     *  application.getUser(id).then((user) => {
     *    console.log('User details: 'user);
     *  }).catch((error) => {
     *      console.error(error);
     *  });
    */
    async getUser(user_id = this.me.id) {
        try {
            const response = await this.session.sendNetworkRequest({
                type: 'GET',
                path: `users/${user_id}`
            });
            return new user_1.default(this, response);
        }
        catch (error) {
            throw new nexmoClientError_1.NexmoApiError(error);
        }
    }
    /**
     * Query the service to obtain a complete list of userSessions of a given user
   * @param {object} params configure defaults for paginated user sessions query
   * @param {string} params.order 'asc' or 'desc' ordering of resources based on creation time
   * @param {number} params.page_size the number of resources returned in a single request list
   * @param {string} [params.cursor] string to access the starting point of a dataset
   * @param {string} [params.user_id] the user id that the sessions are being fetched
     *
     * @returns {Promise<Page<Map<UserSession>>>}
   * @example <caption>Get User Sessions</caption>
   *  application.getUserSessions({ user_id: "id", page_size: 20 }).then((user_sessions_page) => {
   *    user_sessions_page.items.forEach(user_session => {
   *      render(user_session)
   *    })
   *  }).catch((error) => {
   *      console.error(error);
   *  });
   *
    */
    async getUserSessions(params = {}) {
        var _a;
        const user_id = ((_a = params) === null || _a === void 0 ? void 0 : _a.user_id) || this.me.id;
        const url = `${this.session.config.nexmo_api_url}/v0.3/users/${user_id}/sessions`;
        // Create pageConfig if some elements given otherwise use default
        let pageConfig = Object.keys(params).length === 0 ? this.pageConfig : new page_config_1.default(params);
        try {
            const response = await utils_1.default.paginationRequest(url, pageConfig, this.session.config.token, Application.CONVERSATION_API_VERSION.v3);
            response.application = this;
            const user_sessions_page = new user_sessions_page_1.default(response);
            this.user_sessions_page_last = user_sessions_page;
            return user_sessions_page;
        }
        catch (error) {
            throw new nexmoClientError_1.NexmoApiError(error);
        }
    }
}
exports.default = Application;
/**
 * Enum for Application getConversation version.
 * @readonly
 * @enum {string}
 * @alias Application.CONVERSATION_API_VERSION
*/
Application.CONVERSATION_API_VERSION = {
    v1: 'v0.1',
    v3: 'v0.3'
};
module.exports = Application;
