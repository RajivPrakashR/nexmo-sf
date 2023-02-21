'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Nexmo Client SDK
 *  Conversation Object Model
 *
 * Copyright (c) Nexmo Inc.
 */
const WildEmitter = require('wildemitter');
const loglevel_1 = require("loglevel");
const nexmoClientError_1 = require("./nexmoClientError");
const member_1 = __importDefault(require("./member"));
const nxmEvent_1 = __importDefault(require("./events/nxmEvent"));
const text_event_1 = __importDefault(require("./events/text_event"));
const message_event_1 = __importDefault(require("./events/message_event"));
const media_1 = __importDefault(require("./modules/media"));
const conversation_events_1 = __importDefault(require("./handlers/conversation_events"));
const utils_1 = __importDefault(require("./utils"));
const page_config_1 = __importDefault(require("./pages/page_config"));
const events_page_1 = __importDefault(require("./pages/events_page"));
const members_page_1 = __importDefault(require("./pages/members_page"));
const application_1 = __importDefault(require("./application"));
/**
 * A single conversation Object.
 * @class Conversation
 * @property {Member} me - my Member object that belongs to this conversation
 * @property {Application} application - the parent Application
 * @property {string} name - the name of the Conversation (unique)
 * @property {string} [display_name] - the display_name of the Conversation
 * @property {Map<string, Member>} [members] - the members of the Conversation keyed by a member's id
 * @property {Map<string, NXMEvent>} [events] - the events of the Conversation keyed by an event's id
 * @property {number} [sequence_number] - the last event id
*/
class Conversation {
    constructor(application, params) {
        this.log = loglevel_1.getLogger(this.constructor.name);
        this.application = application;
        this.id = null;
        this.name = null;
        this.display_name = null;
        this.timestamp = null;
        this.members = new Map();
        this.events = new Map();
        this.sequence_number = 0;
        this.pageConfig = new page_config_1.default(((this.application.session || {}).config || {}).events_page_config);
        this.events_page_last = null;
        this.members_page_last = null;
        this.conversationEventHandler = new conversation_events_1.default(application, this);
        this.media = new media_1.default(this);
        /**
         * A Member Object representing the current user.
         * Only set if the user is or has been a member of the Conversation,
         * otherwise the value will be `null`.
         * @type Member
        */
        this.me = null; // We are not in the conversation ourselves by default
        // Map the params (which includes the id)
        this._updateObjectInstance(params);
        WildEmitter.mixin(Conversation);
    }
    /** Update Conversation object params
     * @property {object} params the params to update
     * @private
    */
    _updateObjectInstance(params) {
        for (let key in params) {
            switch (key) {
                case 'id':
                    this.id = params.id;
                    break;
                case 'name':
                    this.name = params.name;
                    break;
                case 'display_name':
                    this.display_name = params.display_name;
                    break;
                case 'members':
                    // update the conversation javascript object
                    params.members.forEach((m) => {
                        if (this.members.has(m.member_id)) {
                            this.members.get(m.member_id)._normalise(m);
                            if (m.user_id === this.application.me.id && m.state !== 'LEFT') {
                                this.me = this.members.get(m.member_id);
                                this.members.set(this.me.id, this.me);
                            }
                        }
                        else {
                            const member = new member_1.default(this, m);
                            if (m.user_id === this.application.me.id && m.state !== 'LEFT') {
                                this.me = member;
                            }
                            this.members.set(member.id, member);
                        }
                    });
                    break;
                case 'timestamp':
                    this.timestamp = params.timestamp;
                    break;
                case 'sequence_number':
                    this.sequence_number = params.sequence_number;
                    break;
                case 'member_id':
                    // filter needed params to create the object
                    // the conversation list gives us the member_id to prepare the member/this object
                    const object_params = {
                        id: params.member_id,
                        state: params.state,
                        user: this.application.me
                    };
                    // update the member object or create a new instance
                    if (this.members.has(params.member_id)) {
                        const member_object = this.members.get(params.member_id);
                        Object.assign(member_object, object_params);
                    }
                    else {
                        const member = new member_1.default(this, object_params);
                        this.me = member;
                        this.members.set(member.id, member);
                    }
                    break;
            }
        }
    }
    /**
     * Join the given User to this Conversation. Will typically be used this to join
     * ourselves to a Conversation we create.
     * Accept an invitation if our Member has state INVITED and no user_id / user_name is given
     *
     * @param {object} [params = this.application.me.id] The User to join (defaults to this)
     * @param {string} params.user_name the user_name of the User to join
     * @param {string} params.user_id the user_id of the User to join
     * @returns {Promise<Member>}
     *
     * @example <caption>join a user to the Conversation</caption>
     *
     * conversation.join().then((member) => {
     *  console.log("joined as member: ", member)
     * }).catch((error) => {
     *  console.error("error joining conversation ", error);
     * });
    */
    async join(params) {
        var _a, _b, _c, _d;
        try {
            let data = {
                state: 'joined',
                channel: {
                    type: 'app'
                },
                user: {
                    ...(!params && { name: this.application.me.name, id: this.application.me.id }),
                    ...(params && params.user_name && { name: params.user_name }),
                    ...(params && params.user_id && { id: params.user_id }),
                },
            };
            if (((_b = (_a = this) === null || _a === void 0 ? void 0 : _a.me) === null || _b === void 0 ? void 0 : _b.id) && ((_d = (_c = this) === null || _c === void 0 ? void 0 : _c.me) === null || _d === void 0 ? void 0 : _d.state) !== 'LEFT') {
                data["from"] = this.me.id;
            }
            const response = await this.application.session.sendNetworkRequest({
                type: 'POST',
                path: `conversations/${this.id}/members`,
                version: 'v0.3',
                data
            });
            const member = new member_1.default(this, response);
            if (response._embedded.user.id === this.application.me.id) {
                this.me = member;
                this.members.set(member.id, member);
            }
            // use case where between the time we got the conversation and the time we finished joining
            // the conversation object changed.
            this.application.getConversation(this.id, application_1.default.CONVERSATION_API_VERSION.v3);
            return member;
        }
        catch (error) {
            throw new nexmoClientError_1.NexmoApiError(error);
        }
    }
    /**
     * Delete a conversation
     * @returns {Promise}
     * @example <caption>delete the Conversation</caption>
     *
     * conversation.del().then(() => {
     *    console.log("conversation deleted");
     * }).catch((error) => {
     *  console.error("error deleting conversation ", error);
     * });
    */
    async del() {
        try {
            const response = await this.application.session.sendNetworkRequest({
                type: 'DELETE',
                path: `conversations/${this.id}`
            });
            this.application.conversations.delete(this.id);
            return response;
        }
        catch (error) {
            throw new nexmoClientError_1.NexmoApiError(error);
        }
    }
    /**
     * Delete an NXMEvent (e.g. Text)
     * @param {NXMEvent} event
     * @returns {Promise}
     * @example <caption>delete an Event</caption>
     *
     * conversation.deleteEvent(eventToBeDeleted).then(() => {
     *  console.log("event was deleted");
     * }).catch((error) => {
     *  console.error("error deleting the event ", error);
     * });
     *
    */
    deleteEvent(event) {
        return event.del();
    }
    /**
      * Invite the given user (id or name) to this conversation
      * @param {Member} params
      * @param {string} [params.id or user_name] - the id or the username of the User to invite
      *
      * @returns {Promise<Member>}
      *
      * @example <caption>invite a user to a Conversation</caption>
      * const user_id = 'id of User to invite';
      * const user_name = 'username of User to invite';
      *
      * conversation.invite({
      *  id: user_id,
      *  user_name: user_name
      * }).then((member) => {
      *  displayMessage(member.state + " user: " + user_id + " " + user_name);
      * }).catch((error) => {
      *  console.error("error inviting user ", error);
      * });
      *
    */
    async invite(params) {
        var _a, _b, _c, _d;
        if (!params || (!params.id && !params.user_name)) {
            throw new nexmoClientError_1.NexmoClientError('error:invite:missing:params');
        }
        const data = {
            state: 'invited',
            user: {
                ...(params.id && { id: params.id }),
                ...(params.user_name && { name: params.user_name })
            },
            media: params.media,
            channel: {
                from: {
                    type: 'app'
                },
                to: {
                    type: 'app'
                },
                type: 'app'
            }
        };
        if (((_b = (_a = this) === null || _a === void 0 ? void 0 : _a.me) === null || _b === void 0 ? void 0 : _b.id) && ((_d = (_c = this) === null || _c === void 0 ? void 0 : _c.me) === null || _d === void 0 ? void 0 : _d.state) !== 'LEFT') {
            data["from"] = this.me.id;
        }
        try {
            const response = await this.application.session.sendNetworkRequest({
                type: 'POST',
                path: `conversations/${this.id}/members`,
                version: 'v0.3',
                data
            });
            const member = new member_1.default(this, response);
            return member;
        }
        catch (error) {
            throw new nexmoClientError_1.NexmoApiError(error);
        }
    }
    /**
      * Invite the given user (id or name) to this conversation with media audio
      * @param {Member} params
      * @param {string} [params.id or user_name] - the id or the username of the User to invite
      *
      * @returns {Promise<Member>}
      *
      * @example <caption>invite a user to a conversation</caption>
      * const user_id = 'id of User to invite';
      * const user_name = 'username of User to invite';
      *
      * conversation.inviteWithAudio({
      *  id: user_id,
      *  user_name: user_name
      * }).then((member) => {
      *  displayMessage(member.state + " user: " + user_id + " " + user_name);
      * }).catch((error) => {
      *  console.error("error inviting user ", error);
      * });
      *
    */
    inviteWithAudio(params) {
        if (!params || (!params.id && !params.user_name)) {
            return Promise.reject(new nexmoClientError_1.NexmoClientError('error:invite:missing:params'));
        }
        params.media = {
            audio_settings: {
                enabled: true,
                muted: false,
                earmuffed: false
            }
        };
        return this.invite(params);
    }
    /**
     * Leave from the Conversation
     * @param {object} [reason] the reason for leaving the conversation
     * @param {string} [reason.reason_code] the code of the reason
     * @param {string} [reason.reason_text] the description of the reason
     * @returns {Promise}
     * @example <caption>leave the Conversation</caption>
     *
     * conversation.leave({reason_code: "mycode", reason_text: "my reason for leaving"}).then(() => {
     *  console.log("successfully left conversation");
     * }).catch((error) => {
     *  console.error("error leaving conversation ", error);
     * });
     *
    */
    leave(reason) {
        return this.me.kick(reason);
    }
    /**
      * Send a text message to the conversation, which will be relayed to every other member of the conversation
      * @param {string} text - the text message to be sent
      *
      * @returns {Promise<TextEvent>} - the text message that was sent
      *
      * @example <caption> sending a text </caption>
      * conversation.sendText("Hi Vonage").then((event) => {
      *  console.log("message was sent", event);
      * }).catch((error)=>{
      *  console.error("error sending the message ", error);
      * });
      *
      * @deprecated since version 8.3.0
      *
    */
    async sendText(text) {
        try {
            if (this.me === null) {
                throw new nexmoClientError_1.NexmoClientError('error:self');
            }
            const msg = {
                type: 'text',
                cid: this.id,
                from: this.me.id,
                body: {
                    text
                }
            };
            const { id, timestamp } = await this.application.session.sendNetworkRequest({
                type: 'POST',
                path: `conversations/${this.id}/events`,
                data: msg
            });
            msg.id = id;
            msg.body.timestamp = timestamp;
            return new text_event_1.default(this, msg);
        }
        catch (error) {
            throw new nexmoClientError_1.NexmoApiError(error);
        }
    }
    /**
      * Send a custom event to the Conversation
      * @param {object} params - params of the custom event
      * @param {string} params.type the name of the custom event. Must not exceed 100 char length and contain only alpha numerics and '-' and '_' characters.
      * @param {object} params.body customizable key value pairs
      *
      * @returns {Promise<NXMEvent>} - the custom event that was sent
      *
      * @example <caption> sending a custom event </caption>
      * conversation.sendCustomEvent({ type: "my-event", body: { mykey: "my value" }}).then((event) => {
      *  console.log("custom event was sent", event);
      * }).catch((error)=>{
      *  console.error("error sending the custom event", error);
      * });
      *
    */
    async sendCustomEvent({ type, body }) {
        try {
            if (this.me === null) {
                throw new nexmoClientError_1.NexmoClientError('error:self');
            }
            else if (!type || typeof type !== 'string' || type.length < 1) {
                throw new nexmoClientError_1.NexmoClientError('error:custom-event:invalid');
            }
            const data = {
                type: `custom:${type}`,
                cid: this.id,
                from: this.me.id,
                body
            };
            const { id, timestamp } = await this.application.session.sendNetworkRequest({
                type: 'POST',
                path: `conversations/${this.id}/events`,
                data
            });
            data.id = id;
            data.timestamp = timestamp;
            return new nxmEvent_1.default(this, data);
        }
        catch (error) {
            throw new nexmoClientError_1.NexmoApiError(error);
        }
    }
    /**
     * Uploads an Image to Media Service.
     * implements xhr (https://xhr.spec.whatwg.org/) - this.imageRequest
     *
     * @param {File} file single input file (jpeg/jpg)
     * @param {object} params - params of image sent
     * @param {string} [params.quality_ratio = 100] a value between 0 and 100. 0 indicates 'maximum compression' and the lowest quality, 100 will result in the highest quality image
     * @param {string} [params.medium_size_ratio = 50] a value between 1 and 100. 1 indicates the new image is 1% of original, 100 - same size as original
     * @param {string} [params.thumbnail_size_ratio = 30] a value between 1 and 100. 1 indicates the new image is 1% of original, 100 - same size as original
     *
     * @returns {Promise<XMLHttpRequest>}
     *
     * @example <caption>uploading an image</caption>
     * const params = {
     *  quality_ratio : "90",
     *  medium_size_ratio: "40",
     *  thumbnail_size_ratio: "20"
     * }
     * conversation.uploadImage(fileInput.files[0], params).then((uploadImageRequest) => {
     *  uploadImageRequest.onprogress = (e) => {
     *    console.log("Image request progress: ", e);
     *    console.log("Image progress: " + e.loaded + "/" + e.total);
     *  };
     *  uploadImageRequest.onabort = (e) => {
     *    console.log("Image request aborted: ", e);
     *    console.log("Image: " + e.type);
     *  };
     *  uploadImageRequest.onloadend = (e) => {
     *    console.log("Image request successful: ", e);
     *    console.log("Image: " + e.type);
     *  };
     *  uploadImageRequest.onreadystatechange = () => {
     *    if (uploadImageRequest.readyState === 4 && uploadImageRequest.status === 200) {
     *      const representations = JSON.parse(uploadImageRequest.responseText);
     *      console.log("Original image url: ", representations.original.url);
     *      console.log("Medium image url: ", representations.medium.url);
     *      console.log("Thumbnail image url: ", representations.thumbnail.url);
     *    }
     *  };
     * }).catch((error) => {
     *    console.error("error uploading the image ", error);
     * });
    */
    async uploadImage(fileInput, params = {
        quality_ratio: '100',
        medium_size_ratio: '50',
        thumbnail_size_ratio: '30'
    }) {
        const formData = new FormData();
        formData.append('file', fileInput);
        formData.append('quality_ratio', params.quality_ratio);
        formData.append('medium_size_ratio', params.medium_size_ratio);
        formData.append('thumbnail_size_ratio', params.thumbnail_size_ratio);
        const imageRequest = await utils_1.default.networkRequest({
            type: 'POST',
            url: this.application.session.config.ips_url,
            data: formData,
            token: this.application.session.config.token
        });
        imageRequest.upload.addEventListener('progress', (evt) => {
            if (evt.lengthComputable) {
                this.log.debug('uploading image ' + evt.loaded + '/' + evt.total);
            }
        }, false);
        imageRequest.onreadystatechange = () => {
            if (imageRequest.status !== 200) {
                this.log.error(imageRequest);
            }
        };
        return imageRequest;
    }
    /**
     * Send an Image message to the conversation, which will be relayed to every other member of the conversation.
     * implements xhr (https://xhr.spec.whatwg.org/) - this.imageRequest
     *
     * @param {File} file single input file (jpeg/jpg)
     * @param {object} params - params of image sent
     * @param {string} [params.quality_ratio = 100] a value between 0 and 100. 0 indicates 'maximum compression' and the lowest quality, 100 will result in the highest quality image
     * @param {string} [params.medium_size_ratio = 50] a value between 1 and 100. 1 indicates the new image is 1% of original, 100 - same size as original
     * @param {string} [params.thumbnail_size_ratio = 30] a value between 1 and 100. 1 indicates the new image is 1% of original, 100 - same size as original
     *
     * @returns {Promise<XMLHttpRequest>}
     *
     * @example <caption>sending an image</caption>
     * const params = {
     *  quality_ratio : "90",
     *  medium_size_ratio: "40",
     *  thumbnail_size_ratio: "20"
     * }
     * conversation.sendImage(fileInput.files[0], params).then((imageRequest) => {
     *  imageRequest.onprogress = (e) => {
     *    console.log("Image request progress: ", e);
     *    console.log("Image progress: " + e.loaded + "/" + e.total);
     *  };
     *  imageRequest.onabort = (e) => {
     *    console.log("Image request aborted: ", e);
     *    console.log("Image: " + e.type);
     *  };
     *  imageRequest.onloadend = (e) => {
     *    console.log("Image request successful: ", e);
     *    console.log("Image: " + e.type);
     *  };
     * }).catch((error) => {
     *  console.error("error sending the image ", error);
     * });
     *
     * @deprecated since version 8.3.0
    */
    async sendImage(fileInput, params = {
        quality_ratio: '100',
        medium_size_ratio: '50',
        thumbnail_size_ratio: '30'
    }) {
        const imageRequest = await this.uploadImage(fileInput, params);
        imageRequest.onreadystatechange = () => {
            if (imageRequest.readyState === 4 && imageRequest.status === 200) {
                try {
                    this.application.session.sendNetworkRequest({
                        type: 'POST',
                        path: `conversations/${this.id}/events`,
                        data: {
                            type: 'image',
                            from: this.me.id,
                            body: {
                                representations: JSON.parse(imageRequest.responseText)
                            }
                        }
                    });
                    this.log.info(imageRequest);
                }
                catch (error) {
                    this.log.error(new nexmoClientError_1.NexmoApiError(error));
                }
            }
        };
        return imageRequest;
    }
    /**
     * Cancel uploading or sending an Image message to the conversation.
     *
     * @param {XMLHttpRequest} imageRequest
     *
     * @returns void
     *
     * @example <caption>cancel sending an image</caption>
     * conversation.sendImage(fileInput.files[0]).then((imageRequest) => {
     *    conversation.abortSendImage(imageRequest);
   * }).catch((error) => {
   *    console.error("error sending the image ", error);
     * });
   *
   * @example <caption>cancel uploading an image</caption>
     * conversation.uploadImage(fileInput.files[0]).then((imageRequest) => {
     *    conversation.abortSendImage(imageRequest);
   * }).catch((error) => {
   *    console.error("error uploading the image ", error);
     * });
    */
    abortSendImage(imageRequest) {
        if (imageRequest instanceof XMLHttpRequest) {
            return imageRequest.abort();
        }
        else {
            return new nexmoClientError_1.NexmoClientError('error:invalid:param:type');
        }
    }
    /**
      * Send a message event to the conversation, which will be relayed to every other member of the conversation
      *
      * @param {object} params the content of the message you want sent
      * @param {string} params.message_type the type of the message. It should be one of 'text', 'image', 'audio', 'video', 'file'
      * @param {string} [params.text] the text content when message type is 'text
      * @param {object} [params.image]
      * @param {string} params.image.url the image url when message type is 'image'
      * @param {object} [params.audio]
      * @param {string} params.audio.url the audio url when message type is 'audio'
      * @param {object} [params.video]
      * @param {string} params.video.url the video url when message type is 'video'
      * @param {object} [params.file]
      * @param {string} params.file.url the file url when message type is 'file'
      *
      * @returns {Promise<MessageEvent>} - the message that was sent
      *
      * @example <caption> sending a message </caption>
      * conversation.sendMessage({ "message_type": "text", "text": "Hi Vonage!" }).then((event) => {
      *  console.log("message was sent", event);
      * }).catch((error)=>{
      *  console.error("error sending the message ", error);
      * });
      *
    */
    async sendMessage(params) {
        var _a;
        if (this.me === null) {
            throw new nexmoClientError_1.NexmoClientError('error:self');
        }
        else if (!((_a = params) === null || _a === void 0 ? void 0 : _a.message_type)) {
            throw new nexmoClientError_1.NexmoClientError('error:message-event:invalid');
        }
        try {
            const msg = {
                type: 'message',
                cid: this.id,
                from: this.me.id,
                body: {
                    ...params
                }
            };
            const { id, timestamp } = await this.application.session.sendNetworkRequest({
                type: 'POST',
                path: `conversations/${this.id}/events`,
                data: msg
            });
            msg.id = id;
            msg.body.timestamp = timestamp;
            return new message_event_1.default(this, msg);
        }
        catch (error) {
            throw new nexmoClientError_1.NexmoApiError(error);
        }
    }
    async _typing(state) {
        const params = {
            activity: (state === 'on') ? 1 : 0
        };
        const data = {
            type: 'text:typing:' + state,
            cid: this.id,
            from: this.me.id,
            body: params
        };
        try {
            await this.application.session.sendNetworkRequest({
                type: 'POST',
                path: `conversations/${this.id}/events`,
                data
            });
            return `text:typing:${state}:success`;
        }
        catch (error) {
            throw new nexmoClientError_1.NexmoApiError(error);
        }
    }
    /**
     * Send start typing indication
     *
     * @returns {Promise} - resolves the promise on successful sent
     *
     * @example <caption>send start typing event when key is pressed</caption>
     * messageTextarea.addEventListener('keypress', (event) => {
     *    conversation.startTyping();
     * });
    */
    startTyping() {
        return this._typing('on');
    }
    /**
     * Send stop typing indication
     *
     * @returns {Promise} - resolves the promise on successful sent
     *
     * @example <caption>send stop typing event when a key has not been pressed for half a second</caption>
     * let timeout = null;
     * messageTextarea.addEventListener('keyup', (event) => {
     *    clearTimeout(timeout);
     *    timeout = setTimeout(() => {
     *      conversation.stopTyping();
     *    }, 500);
     * });
    */
    stopTyping() {
        return this._typing('off');
    }
    /**
      * Query the service to get a list of events in this conversation.
      *
      * @param {object} params configure defaults for paginated events query
      * @param {string} params.order 'asc' or 'desc' ordering of resources based on creation time
      * @param {number} params.page_size the number of resources returned in a single request list
      * @param {string} [params.cursor] string to access the starting point of a dataset
      * @param {string} [params.event_type] the type of event used to filter event requests. Supports wildcard options with :* eg. 'members:*'
      *
      * @returns {Promise<EventsPage<Map<Events>>>} - Populate Conversations.events.
      * @example <caption>Get Events</caption>
      * conversation.getEvents({ event_type: 'member:*' }).then((events_page) => {
      *   events_page.items.forEach(event => {
      *     render(event)
      *   })
      * }).catch((error) => {
      *  console.error("error getting the events ", error);
      * });
    */
    async getEvents(params = {}) {
        const url = `${this.application.session.config.nexmo_api_url}/beta2/conversations/${this.id}/events`;
        // Create pageConfig if given params otherwise use default
        let pageConfig = Object.keys(params).length === 0 ? this.pageConfig : new page_config_1.default(params);
        try {
            const response = await utils_1.default.paginationRequest(url, pageConfig, this.application.session.config.token);
            response.application = this.application;
            response.conversation = this;
            const events_page = new events_page_1.default(response);
            this.events_page_last = events_page;
            return events_page;
        }
        catch (error) {
            throw new nexmoClientError_1.NexmoApiError(error);
        }
    }
    /**
      * Query the service to get a list of members in this conversation.
      *
      * @param {object} params configure defaults for paginated events query
      * @param {string} params.order 'asc' or 'desc' ordering of resources based on creation time
      * @param {number} params.page_size the number of resources returned in a single request list
      * @param {string} [params.cursor] string to access the starting point of a dataset
      *
      * @returns {Promise<MembersPage<Map<Member>>>}
      * @example <caption>Get Members</caption>
      * const params = {
      *   order: "desc",
      *   page_size: 100
      * }
      * conversation.getMembers(params).then((members_page) => {
      *   members_page.items.forEach(member => {
      *     render(member)
      *   })
      * }).catch((error) => {
      *  console.error("error getting the members ", error);
      * });
    */
    async getMembers(params = {}) {
        const url = `${this.application.session.config.nexmo_api_url}/beta2/conversations/${this.id}/members`;
        // Create pageConfig if given params otherwise use default
        let pageConfig = Object.keys(params).length === 0 ? this.pageConfig : new page_config_1.default(params);
        try {
            const response = await utils_1.default.paginationRequest(url, pageConfig, this.application.session.config.token);
            response.application = this.application;
            response.conversation = this;
            const members_page = new members_page_1.default(response);
            this.members_page_last = members_page;
            return members_page;
        }
        catch (error) {
            throw new nexmoClientError_1.NexmoApiError(error);
        }
    }
    /**
      * Query the service to get my member in this conversation.
      *
      * @returns {Promise<Member>}
      * @example <caption>Get My Member</caption>
      * conversation.getMyMember().then((member) => {
      *   render(member)
      * }).catch((error) => {
      *  console.error("error getting my member", error);
      * });
    */
    async getMyMember() {
        try {
            const response = await this.application.session.sendNetworkRequest({
                type: 'GET',
                path: `conversations/${this.id}/members/me`,
                version: 'v0.3'
            });
            const member = new member_1.default(this, response);
            return member;
        }
        catch (error) {
            throw new nexmoClientError_1.NexmoApiError(error);
        }
    }
    /**
      * Query the service to get a member in this conversation.
      *
      * @param {string} member_id the id of the member to return
      *
      * @returns {Promise<Member>}
      * @example <caption>Get Member</caption>
      * conversation.getMember("MEM-id").then((member) => {
      *   render(member)
      * }).catch((error) => {
      *  console.error("error getting member", error);
      * });
    */
    async getMember(member_id) {
        try {
            const response = await this.application.session.sendNetworkRequest({
                type: 'GET',
                path: `conversations/${this.id}/members/${member_id}`,
                version: 'v0.3'
            });
            const member = new member_1.default(this, response);
            return member;
        }
        catch (error) {
            throw new nexmoClientError_1.NexmoApiError(error);
        }
    }
    /**
     * Handle and event from the cloud.
     * using conversationEventHandler
     * @param {object} event
     * @private
    */
    _handleEvent(event) {
        var _a, _b, _c, _d;
        if (event.type.startsWith('rtc')) {
            // keep the rtc events going to the application layer, we use them in media module
            this.emit(event.type, event);
            return Promise.resolve(event);
        }
        this.sequence_number++;
        // make sure the event_id is not a string
        if (event.body && event.body.event_id && typeof event.body.event_id === 'string') {
            event.body.event_id = parseInt(event.body.event_id);
        }
        let memberInfo = { memberId: event.from };
        if ((_b = (_a = event) === null || _a === void 0 ? void 0 : _a.body) === null || _b === void 0 ? void 0 : _b.user) {
            const { id, name, display_name, image_url, custom_data } = event.body.user;
            memberInfo = { ...memberInfo, ...{
                    ...(id && { userId: id }),
                    ...(name && { userName: name }),
                    ...(display_name && { displayName: display_name }),
                    ...(image_url && { imageUrl: image_url }),
                    ...(custom_data && { customData: custom_data })
                } };
        }
        else if ((_d = (_c = event) === null || _c === void 0 ? void 0 : _c._embedded) === null || _d === void 0 ? void 0 : _d.from_user) {
            const { id, name, display_name, image_url, custom_data } = event._embedded.from_user;
            memberInfo = { ...memberInfo, ...{
                    ...(id && { userId: id }),
                    ...(name && { userName: name }),
                    ...(display_name && { displayName: display_name }),
                    ...(image_url && { imageUrl: image_url }),
                    ...(custom_data && { customData: custom_data })
                } };
        }
        let constructed_event = this.conversationEventHandler.handleEvent(event);
        // Unless they are typing events, add the event to the conversation.events map
        if (!['text:typing:on', 'text:typing:off'].includes(event.type)) {
            this.events.set(constructed_event.id, constructed_event);
        }
        // For custom events remove the custom: prefix before emitting event
        if (event.type.startsWith('custom:')) {
            this.emit(constructed_event.type, memberInfo, constructed_event);
            return Promise.resolve(event);
        }
        this.emit(event.type, memberInfo, constructed_event);
        return Promise.resolve(event);
    }
}
exports.default = Conversation;
module.exports = Conversation;
