
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
export  class Application {
    log: Logger;
    session: any;
    conversations: Map<string, Conversation>;
    synced_conversations_count: number;
    start_sync_time: number;
    stop_sync_time: number;
    calls: Map<string, NXMCall>;
    _call_draft_list: Map<string, NXMCall>;
    pageConfig: PageConfig;
    conversations_page_last: ConversationsPage | null;
    user_sessions_page_last: UserSessionsPage | null;
    me: User;
    synced_conversations_percentage: number;
    sync_progress_buffer: number;
    activeStreams: MediaStream[];
    eventsQueue: EventsQueue;
    emit: any;
    on: any;
    off: any;
    once: any;
    /**
     * Enum for Application getConversation version.
     * @readonly
     * @enum {string}
     * @alias Application.CONVERSATION_API_VERSION
    */
    static CONVERSATION_API_VERSION: {
        v1: string;
        v3: string;
    };
    constructor(session: any, params?: Object);
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
    updateOrCreateConversation(payload: any): Conversation;
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
    _enqueueEvent(response: CAPIResponse): Promise<void>;
    /**
     * Entry point for events in Application level
     * @private
    */
    _handleEvent(event: CAPIResponse): Promise<CAPIResponse>;
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
    updateToken(token: string): Promise<void>;
    /**
     * Update the event to map local generated events
     * in case we need a more specific event to pass in the application listener
     * or f/w the event as it comes
     * @private
    */
    _handleApplicationEvent(event: CAPIResponse): Promise<CAPIResponse>;
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
    inAppCall(usernames: string[]): Promise<NXMCall>;
    /**
     * Creates a call to phone a number.
     * The call object is created under application.calls when the call has started.
     * listen for it with application.on("call:status:changed")
     *
     * You don't need to start the stream, the SDK will play the audio for you
     *
     * @classdesc creates a call to a phone number
   * @param {string} user the phone number or the username you want to call
   * @param {string} [type="phone"] the type of the call you want to have. possible values "phone" or "app" ( is "phone")
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
    callServer(user: string, type?: string, custom_data?: Object): Promise<NXMCall>;
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
    reconnectCall(conversationId: string, rtcId: string, mediaParams?: Object): Promise<NXMCall>;
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
    newConversation(data?: Object): Promise<Conversation>;
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
    newConversationAndJoin(params?: Object): Promise<Conversation>;
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
    getConversation(id: string, version?: string): Promise<Conversation>;
    /**
     * Query the service to obtain a complete list of conversations of which the
     * logged-in user is a member with a state of `JOINED` or `INVITED`.
   * @param {object} params configure s for paginated conversations query
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
    getConversations(params?: Object): Promise<ConversationsPage>;
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
    syncConversations(conversations: Conversation[]): void;
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
    getUser(user_id?: string): Promise<User>;
    /**
     * Query the service to obtain a complete list of userSessions of a given user
   * @param {object} params configure s for paginated user sessions query
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
    getUserSessions(params?: Object): Promise<UserSessionsPage>;
}

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
export  class Conversation {
    log: Logger;
    application: Application;
    id: string;
    name: string;
    display_name: string;
    timestamp: string;
    members?: Map<string, Member>;
    events: Map<string, NXMEvent>;
    sequence_number: number;
    pageConfig: PageConfig;
    events_page_last: EventsPage;
    members_page_last: MembersPage;
    conversationEventHandler: ConversationEventHandler;
    media: Media;
    me: Member;
    emit: any;
    on: any;
    off: any;
    once: any;
    releaseGroup: any;
    constructor(application: Application, params?: Object);
    /** Update Conversation object params
     * @property {object} params the params to update
     * @private
    */
    _updateObjectInstance(params: {
        id?: string;
        name?: string;
        display_name?: string;
        members?: Member[];
        timestamp?: string;
        sequence_number?: number;
        member_id?: string;
        state?: string;
    }): void;
    /**
     * Join the given User to this Conversation. Will typically be used this to join
     * ourselves to a Conversation we create.
     * Accept an invitation if our Member has state INVITED and no user_id / user_name is given
     *
     * @param {object} [params = this.application.me.id] The User to join (s to this)
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
    join(params?: {
        user_name?: string;
        user_id?: string;
    }): Promise<Member>;
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
    del(): Promise<Object>;
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
    deleteEvent(event: NXMEvent): Promise<void>;
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
    invite(params?: InviteParams): Promise<Member>;
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
    inviteWithAudio(params?: InviteParams): Promise<Member>;
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
    leave(reason?: {
        reason_code?: string;
        reason_text?: string;
    }): Promise<Object>;
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
    sendText(text: string): Promise<TextEvent>;
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
    sendCustomEvent({ type, body }: {
        type: string;
        body: Object;
    }): Promise<NXMEvent>;
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
    uploadImage(fileInput: File, params?: {
        quality_ratio: string;
        medium_size_ratio: string;
        thumbnail_size_ratio: string;
    }): Promise<XMLHttpRequest>;
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
    sendImage(fileInput: File, params?: {
        quality_ratio: string;
        medium_size_ratio: string;
        thumbnail_size_ratio: string;
    }): Promise<XMLHttpRequest>;
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
    abortSendImage(imageRequest: XMLHttpRequest): void | NexmoClientError;
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
    sendMessage(params: MessageEventParams): Promise<TextEvent>;
    _typing(state: string): Promise<string>;
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
    startTyping(): Promise<string>;
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
    stopTyping(): Promise<string>;
    /**
      * Query the service to get a list of events in this conversation.
      *
      * @param {object} params configure s for paginated events query
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
    getEvents(params?: Object): Promise<EventsPage>;
    /**
      * Query the service to get a list of members in this conversation.
      *
      * @param {object} params configure s for paginated events query
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
    getMembers(params?: Object): Promise<MembersPage>;
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
    getMyMember(): Promise<Member>;
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
    getMember(member_id: string): Promise<Member>;
    /**
     * Handle and event from the cloud.
     * using conversationEventHandler
     * @param {object} event
     * @private
    */
    _handleEvent(event: CAPIResponse): Promise<CAPIResponse>;
}


/**
 * An image event
 *
 * @class ImageEvent
 * @extends NXMEvent
*/
export  class ImageEvent extends NXMEvent {
    log: Logger;
    constructor(conversation: Conversation, params?: {
        body?: {
            timestamp?: string;
            representations?: ImageRepresentations;
        };
    });
    /**
     * Set the imageEvent status to 'seen'
     * @returns {Promise}
     * @example <caption>Set the imageEvent status to 'seen'</caption>
     *  imageEvent.seen().then(() => {
     *    console.log("image event status set to seen");
     *  }).catch((error)=>{
     *	console.log("error setting image event status to seen ", error);
     *  });
     */
    seen(): Promise<void>;
    /**
     * Set the imageEvent status to 'delivered'
     * @returns {Promise}
     * @example <caption>Set the imageEvent status to 'delivered'</caption>
     *  imageEvent.delivered().then(() => {
     *    console.log("image event status set to delivered");
     *  }).catch((error)=>{
     *	console.log("error setting image event status to delivered  ", error);
     *  });
     */
    delivered(): Promise<void>;
    /**
     * Delete the image event, all 3 representations of it
     * passing only the one of the three URLs
     * @returns {Promise}
     * @example <caption>Delete the imageEvent</caption>
     *  imageEvent.del().then(() => {
     *    console.log("image event deleted");
     *  }).catch((error)=>{
     *	console.log("error deleting image event  ", error);
     *  });
     */
    del(): Promise<void>;
    /**
     * Download an Image from Media service //3 representations
     * @param {string} [type="thumbnail"] original, medium, or thumbnail
     * @param {string} [representations=this.body.representations]  the ImageEvent.body for the image to download
     * @returns {string} the dataUrl "data:image/jpeg;base64..."
     * @example <caption>Downloading an image from the imageEvent</caption>
     *  imageEvent.fetchImage("medium").then((imageData) => {
     *    const img = new Image();
     *    img.src = imageData;
     *    document.body.appendChild(img);
     *  }).catch((error)=>{
     *	console.log("error getting image ", error);
     *  });
    */
    fetchImage(type?: string, imageRepresentations?: ImageRepresentations): Promise<string>;
}

/**
 * A message event
 *
 * @class MessageEvent
 * @extends NXMEvent
*/
export  class MessageEvent extends NXMEvent {
    log: Logger;
    constructor(conversation: Conversation, params?: {
        body?: {
            timestamp?: string;
        };
    });
    /**
     * Set the messageEvent status to 'seen'
     * @returns {Promise}
     * @example <caption>Set the messageEvent status to 'seen'</caption>
     *  messageEvent.seen().then(() => {
     *    console.log("message event status set to seen");
     *  }).catch((error)=>{
     *	  console.log("error setting message event status to seen ", error);
     *  });
     */
    seen(): Promise<void>;
    /**
     * Set the messageEvent status to 'delivered'.
     * handled by the SDK
     * @returns {Promise}
     * @example <caption>Set the messageEvent status to 'delivered'</caption>
     *  messageEvent.delivered().then(() => {
     *    console.log("message event status set to delivered");
     *  }).catch((error)=>{
     *	  console.log("error setting message event status to delivered  ", error);
     *  });
     */
    delivered(): Promise<void>;
    /**
     * Delete the messageEvent
     * @returns {Promise}
     * @example <caption>Delete the messageEvent</caption>
     *  messageEvent.del().then(() => {
     *    console.log("message event deleted");
     *  }).catch((error)=>{
     *	  console.log("error deleting message event  ", error);
     *  });
     */
    del(): Promise<void>;
    /**
     * Download an Image from Media service
     * @returns {string} the dataUrl "data:image/jpeg;base64..."
     * @example <caption>Downloading an image from the messageEvent</caption>
     *  messageEvent.fetchImage().then((imageData) => {
     *    const img = new Image();
     *    img.src = imageData;
     *    document.body.appendChild(img);
     *  }).catch((error) => {
     *    console.log("error getting image ", error);
     *  });
    */
    fetchImage(): Promise<string>;
}

/**
 * Conversation NXMEvent Object.
 * The super class that holds the base events that apply to
 * common event objects.
 * @class NXMEvent
 */
export  class NXMEvent {
    conversation: Conversation;
    type: string;
    cid: string;
    from: string;
    timestamp: Object;
    id: string;
    state: {
        delivered_to?: {
            [key: string]: string;
        };
        seen_by?: {
            [key: string]: string;
        };
        submitted_to?: {
            [key: string]: string;
        };
        rejected_by?: {
            [key: string]: string;
        };
        undeliverable_to?: {
            [key: string]: string;
        };
    };
    index: number;
    streamIndex: number;
    body?: {
        user?: {
            user_id?: string;
            display_name?: string;
            id?: string;
            media?: {
                audio_settings?: {
                    enabled?: boolean;
                };
            };
        };
        member_id?: string;
        sdp?: string;
        digit?: number;
        digits?: number;
        representations?: any;
        timestamp?: Object;
        text?: string;
        channel?: Channel;
        invited_by?: string | null;
        message_type?: string;
        image?: {
            url: string;
        };
        audio?: {
            url: string;
        };
        video?: {
            url: string;
        };
        file?: {
            url: string;
        };
    };
    digit: number;
    application_id: string;
    constructor(conversation: Conversation, params?: {
        type?: string;
        application_id?: string;
        cid?: string;
        from?: string;
        timestamp?: string;
        id?: string;
        state?: {
            delivered_to?: {
                [key: string]: string;
            };
            seen_by?: {
                [key: string]: string;
            };
            submitted_to?: {
                [key: string]: string;
            };
            rejected_by?: {
                [key: string]: string;
            };
            undeliverable_to?: {
                [key: string]: string;
            };
        };
        index?: number;
        streamIndex?: number;
        body?: Object;
        _embedded?: {
            from_user?: {
                display_name?: string;
                id?: string;
                name?: string;
            };
            from_member?: {
                display_name?: string;
                id?: string;
                name?: string;
            };
        };
    });
    /**
     * Delete the event
     * @param {number} [event_id=this.event_id] if the event id param is not present, "this" event will be 
     * @returns {Promise}
     * @private
    */
    del(event_id?: string): Promise<void>;
    /**
     * Mark as Delivered the event
     * @param {number} [event_id=this.event_id] if the event id is not provided, the this event will be used
     * @returns {Promise}
     * @private
     */
    delivered(event_id?: string): Promise<void>;
    /**
     * Mark as Seen the event
     * @param {number} [event_id=this.event_id] if the event id is not provided, the this event will be used
     * @returns {Promise}
     * @private
    */
    seen(event_id?: string): Promise<void>;
}

/**
 * A text event
 *
 * @class TextEvent
 * @extends NXMEvent
*/
export  class TextEvent extends NXMEvent {
    constructor(conversation: Conversation, params?: {
        body?: {
            timestamp?: string;
        };
    });
    /**
     * Set the textEvent status to 'seen'
     * @returns {Promise}
     * @example <caption>Set the textEvent status to 'seen'</caption>
     *  textEvent.seen().then(() => {
     *    console.log("text event status set to seen");
     *  }).catch((error)=>{
     *	console.log("error setting text event status to seen ", error);
     *  });
     */
    seen(): Promise<void>;
    /**
     * Set the textEvent status to 'delivered'.
     * handled by the SDK
     * @returns {Promise}
     * @example <caption>Set the textEvent status to 'delivered'</caption>
     *  textEvent.delivered().then(() => {
     *    console.log("text event status set to delivered");
     *  }).catch((error)=>{
     *	console.log("error setting text event status to delivered  ", error);
     *  });
     */
    delivered(): Promise<void>;
    /**
     * Delete the textEvent
     * @returns {Promise}
     * @example <caption>Delete the textEvent</caption>
     *  textEvent.del().then(() => {
     *    console.log("text event deleted");
     *  }).catch((error)=>{
     *	console.log("error deleting text event  ", error);
     *  });
     */
    del(): Promise<void>;
}


/**
 * Handle Application Events
 *
 * @class ApplicationEventsHandler
 * @param {Application} application
 * @param {Conversation} conversation
 * @private
*/
export  class ApplicationEventsHandler {
    log: Logger;
    application: Application;
    _handleApplicationEventMap: {
        [key: string]: Function;
    };
    constructor(application: Application);
    /**
      * Handle and event.
      *
      * Update the event to map local generated events
      * in case we need a more specific event to pass in the application listener
      * or f/w the event as it comes
      * @param {object} event
      * @private
    */
    handleEvent(event: CAPIResponse): any;
    /**
      * case: call to PSTN, after knocking event we receive joined
      * @private
    */
    private _processMemberJoined;
    private _processMemberInvited;
}

/**
 * Handle Conversation Events
 *
 * @class ConversationEventsHandler
 * @param {Application} application
 * @param {Conversation} conversation
 * @private
*/
export  class ConversationEventHandler {
    log: Logger;
    application: Application;
    conversation: Conversation;
    constructed_event: NXMEvent;
    _handleEventMap: {
        [key: string]: Function;
    };
    constructor(application: Application, conversation: Conversation);
    /**
      * Handle and event.
      *
      * Identify the type of the event,
      * create the corresponding Class instance
      * emit to the corresponding Objects
      * @param {object} event
      * @private
    */
    handleEvent(event: CAPIResponse): NXMEvent;
    /**
      * Mark the requested event as delivered
      * use that event as constructed to update the local events' map
        * @param {object} event
      * @returns the NXMEvent that is marked as delivered
      * @private
    */
    private _processDelivered;
    /**
      * Delete the requested event
      * empty the payload of the event (text, image or message)
      * use that event as constructed to update the local events map
      * @param {object} event
      * @returns the deleted events
      * @private
    */
    private _processDelete;
    /**
      * Return an ImageEvent with the corresponding image data
      * @param {object} event
      * @returns {ImageEvent}
    */
    private _processImage;
    /**
      * Handle events for member state changes (joined, invited, left)
      * in conversation level.
      * Other members are going through here too.
      * For .me member initial event (join, invite) use the application listener
        * @param {object} event
      * @returns {NXMEvent}
      * @private
    */
    private _processMember;
    /**
     * Handle events for leg status updates in conversation level.
     * Other member's legs are going through here too.
     * @param {object} event
     * @returns {NXMEvent}
     * @private
    */
    private _processLegStatus;
    /**
      * Handle member:media events
      * use a call object if and the member object
        * @param {object} event
      * @private
    */
    private _processMedia;
    /**
      * Handle *:mute:* events
        * @param {object} event
      * @private
    */
    private _processMuteForMedia;
    /**
      * Mark the requested event as seen
      * use that event as constructed to update the local Events map
        * @param {object} event
      * @private
    */
    private _processSeen;
    /**
      * Create the TextEvent object and trigger .delivered()
        * @param {object} event
      * @private
    */
    private _processText;
    /**
      * Create the MessageEvent object and trigger .delivered()
        * @param {object} event
      * @private
    */
    private _processMessage;
    /**
      * Mark the requested event as submitted
      * use that event as constructed to update the local Events map
        * @param {object} event
      * @private
    */
    private _processSubmitted;
    /**
      * Mark the requested event as rejected
      * use that event as constructed to update the local Events map
        * @param {object} event
      * @private
    */
    private _processRejected;
    /**
      * Mark the requested event as undeliverable
      * use that event as constructed to update the local Events map
        * @param {object} event
      * @private
    */
    private _processUndeliverable;
}

/**
 * Handle Mapping of Conversation Ids to ConversationEventsProcessor
 *
 * @class EventsQueue
 * @private
 */
export declare class EventsQueue {
    callback: any;
    cidMap: Map<String, ConversationEventsProcessor>;
    log: Logger;
    constructor(callback: any);
    enqueue(event: CAPIResponse, application: Application): Promise<any>;
}
/**
 * Handle Ordering of Conversation Events for Processing
 *
 * @class ConversationEventsProcessor
 * @private
 */
export declare class ConversationEventsProcessor {
    cid: string;
    eventsMap: Map<Number, CAPIResponse>;
    lastEventIdProcessed: number;
    largestEventIdInQueue: number;
    callback: any;
    processing: Boolean;
    application: Application;
    eventsFetchRange: number;
    log: Logger;
    constructor(cid: string, lastEventIdProcessed: number, application: Application);
    enqueue(eventId: number, event: CAPIResponse): CAPIResponse;
    dequeue(eventId: number): CAPIResponse;
    processEvents(): Promise<any>;
    processNextEvent(eventId: number): Promise<CAPIResponse>;
    fetchEventsAndProcess(missingEvent: number): Promise<CAPIResponse>;
    fetchConversationEvents(start_id: number, range: number): Promise<Array<CAPIResponse>>;
}

/**
 * Handle rtc Events
 *
 * @class RtcEventHandler
 * @private
 */
export  class RtcEventHandler {
    log: Logger;
    application: Application;
    _handleRtcEventMap: {
        [key: string]: Function;
    };
    constructor(application: Application);
    /**
     * Entry point for rtc events
     * @param {object} event
     * @private
     */
    _handleRtcEvent(event: CAPIResponse): void;
    /**
      * on transfer event
      * update the conversation object in the NXMCall,
      * update the media object in the new conversation
      * set `transferred_to` <Conversation> on the member that is transferred
      * @param {object} event
      * @private
    */
    private _processRtcTransfer;
    /**
     * Handle rtc:answer event
     *
     * @param {object} event
     * @private
     */
    private _processRtcAnswer;
    /**
     * Handle rtc:hangup event
     *
     * @param {object} event
     * @private
     */
    private _processRtcHangup;
}

/**
 * Handle sip Events
 *
 * @class SipEventHandler
 * @private
  */
export  class SipEventHandler {
    log: Logger;
    application: Application;
    _handleSipCallEventMap: {
        [key: string]: Function;
    };
    constructor(application: Application);
    /**
     * Entry point for sip events
     * The event belongs to a call Object
     * @private
    */
    _handleSipCallEvent(event: CAPIResponse): any;
    /**
     * Handle sip:hangup event
     *
     * @param {object} event_call
     * @private
     */
    private _processSipHangup;
    /**
     * Handle sip:ringing event
     *
     * @param {object} event_call
     * @private
     */
    private _processSipRinging;
}

/**
 * An individual user (i.e. conversation member).
 * @class Member
 * @param {Conversation} conversation
 * @param {object} params
*/
export  class Member {
    conversation: Conversation;
    callStatus: string | null;
    id: string;
    user?: any;
    channel: any;
    timestamp: {
        invited?: string;
        joined?: string;
        left?: string;
    };
    state: string;
    display_name: string;
    invited_by: string;
    user_id: string;
    name: string;
    media?: Media;
    stream?: MediaStream;
    pc?: RTCPeerConnection;
    emit: any;
    on: any;
    off: any;
    once: any;
    transferred_to?: Conversation;
    transferred_from?: Conversation;
    [key: string]: any;
    constructor(conversation: Conversation, params?: Object);
    /**
     * Update object instance and align attribute names
     *
     * Handle params input to keep consistent the member object
     * @param {object} params member attributes
     * @private
    */
    _normalise(params?: any): void;
    /**
     * Play the given stream only to this member within the conversation
     *
     * @param {string} [params]
     *
     * @returns {Promise<NXMEvent>}
     * @private
    */
    playStream(params: Object): Promise<NXMEvent>;
    /**
     * Speak the given text only to this member within the Conversation.
     *
     * @param {string} [params]
     *
     * @returns {Promise<NXMEvent>}
     * @private
    */
    sayText(params: {
        text: string;
        voice_name?: string;
        level?: number;
        queue?: boolean;
        loop?: number;
        ssml?: boolean;
    }): Promise<NXMEvent>;
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
    kick(reason?: {
        [key: string]: string;
    }): Promise<Object>;
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
    mute(mute: boolean, streamIndex?: number): Promise<Object>;
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
    earmuff(earmuff: boolean): Promise<Object>;
    /**
     * Handle member object events
     *
     * Handle events that are modifying this member instance
     * @param {NXMEvent} event invited, joined, left, media events
     * @private
    */
    _handleEvent(event: CAPIResponse): void;
    /**
       * Set the member.callStatus and emit a member:call:status event
       *
       * @param {Member.callStatus} this.callStatus the call status to set
       * @private
      */
    private _setCallStatusAndEmit;
}


/**
 * Class that can emit errors via any emitter passed to it.
 * @class ErrorsEmitter
 * @param {Emitter} emitter - Any event emitter that implements "emit" and "releaseGroup". Basically object that is mixed with Wildemitter.
 * @property {string} LISTENER_GROUP='NXM-errors' - the group this emitter will register
 * @emits Emitter#NXM-errors
 * @private
*/
/**
 * Application listening for client and expired-token errors events.
 *
 * @event Application#NXM-errors
 *
 * @property {NexmoClientError} error
 *
 * @example <caption>listen for client error events on Application level</caption>
 * application.on('*', 'NXM-errors', (error) => {
 *    console.log('Error thrown with type ' + error.type);
 *  });
 * @example <caption>listen for expired-token error events and then update the token on Application level</caption>
 * application.on('system:error:expired-token', 'NXM-errors', (error) => {
 * 	console.log('token expired');
 * 	application.updateToken(token);
 * });
*/
export  class ErrorsEmitter {
    log: Logger;
    emitter: any;
    LISTENER_GROUP: string;
    constructor(emitter: any);
    /**
     * Detect if the param.type includes error and emit that payload in the LISTENER_GROUP
     * @param param - the payload to forward in the LISTENER_GROUP
     * @param param.type - the type of the event to check if it's an error
    */
    emitResponseIfError(param: {
        type: string;
    }): null;
    /**
     * Release Group on the registered emitter (using the namespace LISTENER_GROUP that is set)
    */
    cleanup(): any;
    /**
     * Returns true if the param includes 'error'
     * @param {string} type - the error type to check
    */
    _isTypeError(param: {
        indexOf: (arg0: string) => number;
    }): boolean;
}

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
export  class Media {
    log: Logger;
    rtcHelper: RtcHelper;
    application: Application;
    parentConversation: Conversation;
    rtcObjects: {
        [key: string]: {
            rtc_id: string;
            pc: RTCPeerConnection;
            stream: MediaStream;
            type: string;
            streamIndex: number;
        };
    };
    streamIndex: number;
    rtcstats_conf: RTCStatsConfig;
    rtcStats: RTCStatsAnalytics;
    pc: RTCPeerConnection;
    listeningToRtcEvent: boolean;
    me: Member;
    constructor();
    constructor(conversation: Conversation);
    constructor(application: Application);
    _attachEndingEventHandlers(): void;
    /**
     * Switch on the rtc stats emit events
     * @private
     */
    _enableStatsEvents(): void;
    /**
     * Switch off the rtcStat events
     * @private
     */
    _disableStatsEvents(): void;
    /**
     * Function used to init the media stream
     * @private
     */
    private _audioInitHandler;
    /**
     * Handles the enabling of audio when an offer is available
     * @private
     */
    private _execAnswer;
    /**
     * Handles the enabling of audio only stream with rtc:new
     * @private
     */
    private _handleAudio;
    private _findRtcObjectByType;
    private _cleanConversationProperties;
    /**
     * Cleans up the user's media before leaving the conversation
     * @private
     */
    private _cleanMediaProperties;
    private _disableLeg;
    _enableMediaTracks(tracks: MediaStreamTrack[], enabled: boolean): void;
    /**
     * Send a mute request with the rtc_id and enable/disable the tracks
     * If the mute request fails revert the changes in the tracks
     * @private
     */
    private _setMediaTracksAndMute;
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
    updateAudioConstraints(constraints?: Object): Promise<MediaStream | Object | NexmoApiError>;
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
    mute(mute?: boolean, streamIndex?: number): Promise<Object>;
    /**
     * Earmuff our member
     *
     * @param {boolean} [params]
     *
     * @returns {Promise}
     * @private
     */
    earmuff(earmuff: boolean): Promise<Object>;
    /**
     * Enable media participation in the conversation for this application (requires WebRTC)
     * @param {object} [params] - rtc params
     * @param {string} [params.label] - label is an application defined tag, eg. ‘fullscreen’
     * @param {string} [params.reconnectRtcId] - the rtc_id / leg_id of the call to reconnect to
     * @param {object} [params.audio=true] - audio enablement mode. possible values "both", "send_only", "receive_only", "none", true or false
     * @param {object} [params.autoPlayAudio=false] - attach the audio stream automatically to start playing after enable media ( false)
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
    enable(params?: {
        label?: string;
        audio?: {
            muted?: boolean;
            earmuffed?: boolean;
            enabled?: boolean;
        };
        offer?: {
            sdp: string;
            leg_id: string;
        };
        autoPlayAudio?: boolean;
        audioConstraints?: {
            autoGainControl?: boolean;
            echoCancellation?: boolean;
            noiseSuppression?: boolean;
            deviceId?: string | Array<string>;
        };
        reconnectRtcId?: string;
    }): Promise<PrewarmResponse | MediaStream>;
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
    disable(): Promise<(string | void)[]>;
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
    sayText(params: {
        text: string;
        voice_name?: string;
        level?: number;
        queue?: boolean;
        loop?: number;
        ssml?: boolean;
    }): Promise<NXMEvent>;
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
    sendDTMF(digit: string): Promise<NXMEvent>;
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
    playStream(params: Object): Promise<NXMEvent>;
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
    startRinging(): Promise<NXMEvent>;
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
    stopRinging(): Promise<NXMEvent>;
}

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
export  class NXMCall {
    application: Application;
    log: Logger;
    from: Member | any;
    conversation: Conversation;
    status: string;
    direction: string;
    to: Map<string, Member>;
    id: string;
    successful_invited_members: Map<string, Member>;
    client_ref: string;
    knocking_id: string;
    CALL_STATUS: {
        [key: string]: string;
    };
    CALL_DIRECTION: {
        [key: string]: string;
    };
    STATUS_PERMITTED_FLOW: Map<string, Set<string>>;
    _handleStatusChangeMap: Map<string, Function>;
    transferred?: boolean;
    stream: MediaStream;
    rtcStats: RTCStatsAnalytics;
    rtcObjects?: {
        [key: string]: {
            rtc_id: string;
            pc: RTCPeerConnection;
            stream: MediaStream;
            type: string;
            streamIndex: number;
        };
    };
    private offer;
    call_disconnect_timeout: any;
    constructor(application: Application, conversation?: Conversation, from?: string | Member);
    /**
     * Enable NXMCall stats to be emitted in
   * - application.inAppCall.on('rtcstats:report')
   * - application.inAppCall.on('rtcstats:analytics')
     * @private
    */
    _enableStatsEvents(): void;
    /**
     * Attach member event listeners from the conversation
     * @private
    */
    private _attachCallListeners;
    /**
     * Validate the current nxmCall status transition
     * If a transition is not defined, return false
     * @param {string} status the status to validate
     * @returns {boolean} false if the transition is not permitted
     * @private
    */
    private _isValidStatusTransition;
    /**
     * Go through the members of the conversation and if .me is the only one (JOINED or INVITED)
     * nxmCall nxmCall.hangUp().
     * @returns {Promise} - empty promise or the nxmCall.hangUp promise chain
    */
    hangUpIfAllLeft(): Promise<Object | void>;
    /**
     * Set the conversation object of the NXMCall
     * update nxmCall.from, and nxmCall.to attributes based on the conversation members
     * @private
    */
    _setupConversationObject(conversation: Conversation, rtc_id?: string): void;
    /**
     * Set the from object of the NXMCall
     * @private
    */
    _setFrom(from: Member): void;
    /**
     * Set the from object of the NXMCall
     * @private
    */
    _setOffer(offer: {
        sdp: string;
        leg_id: string;
    }): void;
    /**
     * Process raw events to figure out the nxmCall status
     * @private
    */
    _handleStatusChange(event: NXMEvent | CAPIResponse): any;
    /**
     * Set the nxmCall.status and emit a call:status:changed event
     *
     * @param {NXMCall.CALL_STATUS} this.CALL_STATUS the canxmCallll status to set
     * @emits Application#call:status:changed
     * @private
    */
    private _setStatusAndEmit;
    /**
     * Answers an incoming nxmCall
     * Join the conversation that you are invited
     * Create autoplay Audio object
     *
   * @param {boolean} [autoPlayAudio=true] attach the audio stream automatically to start playing ( true)
     * @returns {Promise<Audio>}
    */
    answer(autoPlayAudio?: boolean): Promise<MediaStream | PrewarmResponse>;
    /**
     * Trigger the nxmCall flow for the input users.
     * Create a conversation with prefix name "CALL_"
     * and invite all the users.
     * If at least one user is successfully invited, enable the audio.
     *
     * @param {string[]} usernames the usernames of the users to call
   * @param {boolean} [autoPlayAudio=true] attach the audio stream automatically to start playing ( true)
     * @returns {Promise[]} an array of the invite promises for the provided usernames
     * @private
    */
    createCall(usernames: string[], autoPlayAudio?: boolean): Promise<Promise<Member>[]>;
    /**
     * Trigger the nxmCall flow for the phone call.
     * Create a knocking event
     *
     * @param {string} user the phone number or the username to call
   * @param {string} type the type of the call you want to have. possible values "phone" or "app" ( is "phone")
     * @returns {Promise}
     * @private
    */
    createServerCall(user: string, type?: string, custom_data?: Object): Promise<MediaStream>;
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
    hangUp(reason?: {
        [key: string]: string;
    }): Promise<Object>;
    /**
     * Rejects an incoming nxmCall
     * Leave from the conversation that you are invited
     *
   * @param {object} [reason] the reason for rejecting the nxmCall
   * @param {string} [reason.reason_code] the code of the reason
   * @param {string} [reason.reason_text] the description of the reason
     * @returns {Promise}
    */
    reject(reason?: {
        [key: string]: string;
    }): Promise<Object>;
}

export  class PublicIp {
    static v4: (options?: PublicIpOptions) => Promise<string>;
    static v6: (options?: PublicIpOptions) => Promise<string>;
}

/**
 * RTC helper object for accessing webRTC API.
 * @class RtcHelper
 * @private
*/
export  class RtcHelper {
    log: Logger;
    constructor();
    static getUserAudio(audioConstraints?: Object | boolean): Promise<MediaStream>;
    createRTCPeerConnection(config: Object): RTCPeerConnection;
    _getWindowLocationProtocol(): string;
    static _getBrowserName(): string;
    static isNode(): boolean;
    /**
      * Check if the keys in an object are found in another object
    */
    checkValidKeys(object: Object, Object: Object): boolean;
    static cleanCallMediaIfFailed(call: NXMCall): void;
    static callDisconnectHandler(call: NXMCall, pc: RTCPeerConnection): ReturnType<typeof setTimeout>;
    static cleanMediaProperties(call: NXMCall): void;
    static playAudioStream(stream: MediaStream): HTMLAudioElement;
    static createDummyCandidateSDP(pc: RTCPeerConnection): string;
    static createRTCPeerConnectionConfig(application: any): Object;
    static createPeerConnection(application: Application): RTCPeerConnection;
    static sendOffer(application: Application, pc: RTCPeerConnection, conversation: Conversation, reconnectRtcId?: String): Promise<{
        rtc_id: string;
    }>;
    static sendAnswer(application: Application, pc: RTCPeerConnection, conversation: Conversation, leg_id: String): Promise<{
        rtc_id: string;
    }>;
    static createLeg(application: Application, pc: RTCPeerConnection): PostLegResponse;
    static closeStream(stream: MediaStream): void;
    static emitMediaStream(member: Member, pc: RTCPeerConnection, stream: MediaStream): void;
    static _initStatsEvents(context: {
        application: Application;
        conversation?: Conversation;
        pc: RTCPeerConnection;
        rtc_id: string;
    }): RTCStatsAnalytics;
    static attachConversationEventHandlers(context: MediaHandlerContext): void;
    static onconnectionstatechangeHandler: (pc: RTCPeerConnection, log: Logger, nxmCall: NXMCall, resolveCallback: any, rejectCallback: any) => void;
    static oniceconnectionstatechange: (connection_event: RTCPeerConnectionIceEvent, pc: RTCPeerConnection, log: Logger, rejectCallback: any) => void;
    static onnegotiationneededHandler: (pc: RTCPeerConnection, rejectCallback: any) => Promise<void>;
    static doAnswer(context: MediaHandlerContext, offer: string, leg_id: string): void;
    static attachPeerConnectionEventHandlers(context: MediaHandlerContext): void;
    private static addPeerConnectionListeners;
    static prewarmLeg(nxmCall: NXMCall): Promise<PrewarmResponse>;
}

/**
 * Collect WebRTC Report data
 * Removes credential information from the STUN.TURN server configuration.
 * performs Delta compression
 *
 * if isCallback is true the report includes a MOS score : trace('mos', mos, report);
 *
 * @param {object} context
 * @param {Application} context.application
 * @param {Conversation} context.conversation
 * @param {RTCPeerConnection} context.pc peer connection object
 * @param {string} context.rtc_id id of a leg
 * @param {RTCStatsConfig} context.config config settings for ananlytics
 * @property {MosReport} mos_report the final mos report to be sent when the stream is closed
 * @property {number} _reportsCount the number of reports taken for mos average
 * @property {number} _mosSum the summary of mos scores
 * @private
 */
export  class RTCStatsAnalytics {
    mos_report: any;
    _reportsCount: number;
    _mosSum: number;
    intervals: ReturnType<typeof setTimeout>[];
    _deprecationWarningSent: Boolean;
    conversation: Conversation;
    application_id: string;
    constructor(context: RTCStatsAnalyticsParams);
    attachHandlers(context: RTCStatsAnalyticsParams): void;
    emitLastReport(context: RTCStatsAnalyticsParams): void;
    startSendingStats(context: RTCStatsAnalyticsParams): void;
    startEmittingStats(context: RTCStatsAnalyticsParams): void;
    removeIntervals(): void;
    getMos(stats: RTCStatsReport): string;
    /**
     * Update the mos_report object
     * @param {number} mos the MOS score
     * @returns {object} the report object
     */
    updateMOSReport(mos: number): void;
    /**
     * Update the MOS report object
     * mos_report.min - the minimum MOS value during the stream
     * mos_report.max - the maximum MOS value during the stream
     * mos_report.last - the last MOS value during the stream
     * mos_report.average - the average MOS value during the stream
     * @returns {MosReport} mos_report - a report for the MOS values
     *
     */
    getMOSReport(): MosReport;
    static normaliseFloat(value: any): string;
}

/**
 * Error constructor of an NexmoClient-error
 * @param {string} errorInput String client error
*/
export declare class NexmoClientError {
    message: string;
    stack: any;
    name: string;
    log: Logger;
    constructor(errorInput: any);
}
/**
 * Error constructor of an API-error
 * @param {object} error API error, always containing {type: <string>}
*/
export declare class NexmoApiError {
    message: string;
    stack: any;
    name: string;
    log: Logger;
    constructor(errorInput: any);
}



/**
 * A Conversations Page
 *
 * @class ConversationsPage
 * @param {Map} items map of conversations fetched in the paginated query
 * @extends Page
*/
export  class ConversationsPage extends Page {
    items: Map<string, Conversation>;
    constructor(params: {
        items: Object[];
    });
    /**
     * Fetch the previous page if exists
     * @returns {Promise<Page>}
     * @example <caption>Fetch the previous page if exists</caption>
     *  currentConvPage.getPrev().then((prevConvPage) => {
     *    console.log("previous conversation page ", prevConvPage);
     *  }).catch((error) => {
     *    console.error("error getting previous conversation page ", error);
     *  });
    */
    getPrev(): Promise<Page> | Promise<NexmoClientError>;
    /**
     * Fetch the next page if exists
     * @returns {Promise<Page>}
     * @example <caption>Fetch the next page if exists</caption>
     *  currentConvPage.getNext().then((nextConvPage) => {
     *    console.log("next conversation page ", nextConvPage);
     *  }).catch((error) => {
     *    console.error("error getting next conversation page ", error);
     *  });
    */
    getNext(): Promise<Page> | Promise<NexmoClientError>;
}

/**
 * A Events Page
 *
 * @class EventsPage
 * @param {Map} items map of events fetched in the paginated query
 * @extends Page
*/
export  class EventsPage extends Page {
    items: Map<string, NXMEvent | TextEvent | ImageEvent>;
    conversation: Conversation;
    constructor(params: {
        items: Object[];
        conversation: Conversation;
    });
    /**
     * Fetch the previous page if exists
     * @returns {Promise<Page>}
     * @example <caption>Fetch the previous page if exists</caption>
     *  currentEventsPage.getPrev().then((prevEventsPage) => {
     *    console.log("previous events page ", prevEventsPage);
     *  }).catch((error) => {
     *    console.error("error getting previous events page ", error);
     *  });
    */
    getPrev(): Promise<Page> | Promise<NexmoClientError>;
    /**
     * Fetch the next page if exists
     * @returns {Promise<Page>}
     * @example <caption>Fetch the next page if exists</caption>
     *  currentEventsPage.getNext().then((nextEventsPage) => {
     *    console.log("next events page ", nextEventsPage);
     *  }).catch((error) => {
     *    console.error("error getting next events page ", error);
     *  });
    */
    getNext(): Promise<Page> | Promise<NexmoClientError>;
}

/**
 * A Members Page
 *
 * @class MembersPage
 * @param {Map} items map of members fetched in the paginated query
 * @extends Page
*/
export  class MembersPage extends Page {
    items: Map<string, Member>;
    conversation: Conversation;
    constructor(params: {
        items: Object[];
        conversation: Conversation;
    });
    /**
     * Fetch the previous page if exists
     * @returns {Promise<Page>}
     * @example <caption>Fetch the previous page if exists</caption>
     *  currentMembersPage.getPrev().then((prevMembersPage) => {
     *    console.log("previous members page ", prevMembersPage);
     *  }).catch((error) => {
     *    console.error("error getting previous members page ", error);
     *  });
    */
    getPrev(): Promise<Page> | Promise<NexmoClientError>;
    /**
     * Fetch the next page if exists
     * @returns {Promise<Page>}
     * @example <caption>Fetch the next page if exists</caption>
     *  currentMembersPage.getNext().then((nextMembersPage) => {
     *    console.log("next members page ", nextMembersPage);
     *  }).catch((error) => {
     *    console.error("error getting next members page ", error);
     *  });
    */
    getNext(): Promise<Page> | Promise<NexmoClientError>;
}

/** Config Class for Paginated Requests
 *
 * @class PageConfig
 * @param {number} page_size=10 the number of resources returned in a single request list
 * @param {string} order=asc the asc' or 'desc' ordering of resources (usually based on creation time)
 * @param {string} cursor='' cursor parameter to access the next or previous page of a data set
 * @param {string} [event_type] the type of event used to filter event requests
 * @private
*/
export  class PageConfig {
    page_size: number;
    order: string;
    cursor: Object;
    event_type: string;
    constructor(params?: {
        page_size?: number;
        order?: 'string';
        cursor?: Object;
        event_type?: string;
    });
}

/** Page Class for Paginated Results
 *
 * @class Page
 * @param {number} page_size the number of resources returned in a single request list
 * @param {string} order 'asc' or 'desc' ordering of resources (usually based on creation time)
 * @param {string} cursor cursor parameter to access the next or previous page of a data set
 * @param {Application} application - the parent Application
 * @param {string} [event_type] the type of event used to filter event requests
 *
 * @private
*/
export  class Page {
    page_size: number;
    order: string;
    cursor: {
        prev: string;
        next: string;
    };
    application: Application;
    event_type: string;
    constructor(params?: {
        page_size?: number;
        order?: string;
        cursor?: {
            prev: string;
            next: string;
        };
        event_type?: string;
        application?: Application;
        conversation?: Conversation;
        items?: Object[];
    });
    /**
     * Check if previous page exists
     * @returns {Boolean}
     * @example <caption>Check if previous page exists</caption>
     * // currentPage is the current Conversations or Events Page
     * currentPage.hasPrev() // true or false
    */
    hasPrev(): boolean;
    /**
     * Check if next page exists
     * @returns {Boolean}
     * @example <caption>Check if next page exists</caption>
     * // currentPage is the current Conversations or Events Page
     * currentPage.hasNext() // true or false
    */
    hasNext(): boolean;
    /**
      * Create config params for paginationRequest
      * @param {string} cursor cursor parameter to access the next or previous page of a data set
      * @returns {Object}
     * @private
    */
    _getConfig(cursor: string): Object;
    /**
     * Create a nexmoClientError when page does not exist
     * @private
    */
    _getError(): Promise<NexmoClientError>;
}

/**
 * A UserSessions Page
 *
 * @class UserSessionsPage
 * @param {Map} items map of UserSessions fetched in the paginated query
 * @extends Page
*/
export  class UserSessionsPage extends Page {
    items: Map<string, UserSession>;
    constructor(params: {
        items: Object[];
        application: Application;
    });
    /**
     * Fetch the previous page if exists
     * @returns {Promise<Page>}
     * @example <caption>Fetch the previous page if exists</caption>
     *  currentUserSessionsPage.getPrev().then((prevUserSessionsPage) => {
     *    console.log("previous user sessions page ", prevUserSessionsPage);
     *  }).catch((error) => {
     *    console.error("error getting previous user sessions page ", error);
     *  });
    */
    getPrev(): Promise<Page> | Promise<NexmoClientError>;
    /**
     * Fetch the next page if exists
     * @returns {Promise<Page>}
     * @example <caption>Fetch the next page if exists</caption>
     *  currentUserSessionsPage.getNext().then((nextUserSessionsPage) => {
     *    console.log("next user sessions page ", nextUserSessionsPage);
     *  }).catch((error) => {
     *    console.error("error getting next user sessions page ", error);
     *  });
    */
    getNext(): Promise<Page> | Promise<NexmoClientError>;
}

/// <reference types="@types/socket.io-client" />
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
export default class NexmoClient {
    sessionReady: boolean;
    session_id: string | null;
    apiKey: string | null;
    requests: {
        [key: string]: {
            type: string;
            request?: CAPIRequest;
            callback: Function;
        };
    };
    application: Application;
    log: Logger;
    config: Configuration;
    connection: SocketIOClient.Socket;
    errorsEmitter: ErrorsEmitter;
    emit: any;
    /**
     * Enum for NexmoClient disconnection reason.
     * @readonly
     * @enum {string}
     * @alias NexmoClient.DISCONNECT_REASON
    */
    static DISCONNECT_REASON: {
        ClientDisconnected: string;
        TokenExpired: string;
        ConnectionError: string;
    };
    constructor(params?: Configuration);
    /**
     * Creates and sets the socket_io connection
     *
     * @private
    */
    _createAndSetConnection(): SocketIOClient.Socket;
    /**
     * Revert any invalid params to our default
     *
     * @param {object} config the object to sanitize
     * @private
    */
    _sanitizeConfig(incomingConfig: Configuration): Configuration;
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
    sendRequest(request: CAPIRequest, callback: Function): void;
    sendNetworkRequest(params: NetworkRequestParams): Promise<Object>;
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
    createSession(token: string): Promise<Application>;
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
    deleteSession(): Promise<CAPIResponse>;
    updateSession(event: CAPIResponse): any;
    /**
     * Disconnect from the cloud.
     *
    */
    disconnect(): SocketIOClient.Socket;
    /**
     * Connect to the cloud.
     *
    */
    connect(): SocketIOClient.Socket;
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
    connectivityReport(token: string, options?: {
        dcListCallback?: Function;
    }): Promise<Report>;
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
    checkMediaServers(token: string, nexmo_api_url: string, datacenter: string): Promise<MediaConnectionReport[]>;
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
    checkMediaConnectivity(ip: string, port: number): Promise<MediaConnectionReport>;
}

export  class UserSession {
    application: Application;
    id: string;
    _embedded: {
        user: User;
    };
    constructor(application: Application, params?: any);
}

export  class User {
    application: Application;
    id: string;
    name: string;
    constructor(application: Application, params?: Object);
}

/**
 * Utilities class for the SDK.
 *
 * @class Utils
 * @private
 */
export  class Utils {
    /**
     * Get the Member from the username of a conversation
     *
     * @param {string} username the username of the member to get
     * @param {Conversation} conversation the Conversation to search in
     * @returns {Member} the requested Member
     * @static
     */
    static getMemberFromNameOrNull(conversation: Conversation, username: string): Member | null;
    /**
     * Get the Member's number or uri from the event's channel field
     *
     * @param {object} channel the event's channel field
     * @returns {string} the requested Member number or uri
     * @static
     */
    static getMemberNumberFromEventOrNull(channel: Channel): string | null;
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
    static networkRequest(reqObject: ReqObject): Promise<NetworkRequestResponse>;
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
    static paginationRequest(url: string, params: any, token: string, version?: string): Promise<Object>;
    /**
     * Update the Search Params of a url
     * @returns {string} the appended url
     * @static
     */
    static addUrlSearchParams(url: string, params?: {
        [key: string]: string;
    }): string;
    /**
     * Deep merges two objects
     * @returns {Object} the new merged object
     * @static
     */
    static deepMergeObj(obj1: Configuration, obj2: Configuration): Configuration;
    /**
     * Inject a script into the document
     *
     * @param {string} s script being executed
     * @param {requestCallback} c the callback fired after script executed
     * @static
     */
    static injectScript(u: any, c: any): void;
    static allocateUUID(): string;
    /**
     * Validate dtmf digit
     * @static
     */
    static validateDTMF(digit: string): boolean;
    /**
     * Get the nexmo bugsnag api key
     * @private
     */
    static _getBugsnagKey(): string;
    /**
     * Update the member legs array with the new one received in the event
     *
     * @param {Array} legs the member legs array
     * @param {NXMEvent} event the member event holding the new legs array
     * @static
     */
    static updateMemberLegs(legs: Leg[], event: CAPIResponse): Leg[];
    /**
     * Check if the event is referenced to a call or simple conversation
     * @private
     */
    static _isCallEvent(event: CAPIResponse): boolean;
    /**
     * Fetch an image from Media Service
     * @private
     */
    static _fetchImage(url: string, token: string): Promise<string>;
    /**
     * Check if HTTP URL is reachable
     * @private
     */
    static _checkHttpConnectivity(url: string): Promise<HttpsSignalConnectionReport>;
    /**
     * Check if websocket URL is reachable
     * @private
     */
    static _checkWsConnectivity(ws_url: string, path: string, config: Object): Promise<WsSignalConnectionReport>;
    /**
     * Return a list with the connection health of the Media Servers
     * @private
     */
    static _checkMediaServers(token: string, nexmo_api_url: string, datacenter: string): Promise<MediaConnectionReport[]>;
    /**
     * Check if we can establish a peer connection with a specific Media Server
     * @private
     */
    static _checkMediaConnectivity(ip: string, port: number): Promise<MediaConnectionReport>;
    /**
     * Check if the user is re invited to an existing conversation
     * @private
     */
    static _checkIfUserIsReInvited(conversations: Map<String, Conversation>, event: CAPIResponse): boolean;
}

/// <reference types="@types/socket.io-client" />
/// <reference types="@types/node" />


export interface CAPIRequest {
    type: string;
    body: any;
    tid?: string
}

export interface CAPIResponse {
    type: string;
    body: any;
    rid: string;
    delay?: string;
    from?: string;
    cid?: string;
    client_ref?: string;
    timestamp?: string;
    streamIndex?: number;
    id?: string;
    conversation? : any;
    _embedded?: EventEmbeddedInfo;
}

export interface NetworkRequestParams {
    version?: string;
    type: string;
    path: string;
    data?: any
}

export interface User {
    name: string;
    display_name: string;
}

export interface From {
    type: string;
    user: string;
    uri: string;
    number: string;
}

export interface To {
    number: string;
    type: string;
}

export interface Channel {
    id?: string;
    type: string;
    leg_ids: Array<string>;
    leg_settings: Array<string>;
    legs: Array<string>;
    from: From;
    to: To;
}

export interface ReqObject {
    url: string;
    type: string;
    data?: any;
    responseType?: '' | 'json' | 'arraybuffer' | 'blob' | 'document' | 'text';
    token?: string;
}

export interface Response {
    event_type?: string;
    page_size: number;
    _embedded: any;
    _links: any;
}

export interface Leg {
    leg_id: string;
    status: string;
}

export interface ImageRepresentations {
  id: string;
  medium: {
    id: string;
    size: number;
    type: string;
    url: string;
  };
  original: {
    id: string;
    size: number;
    type: string;
    url: string;
  };
  thumbnail: {
    id: string;
    size: number;
    type: string;
    url: string;
  };
  [key: string]: any;
}

export interface Configuration {
  debug?: any;
  log_reporter?: {
    enabled?: boolean;
    bugsnag_key?: string | null;
  };
  environment?: string;
  ips_url?: string;
  nexmo_api_url?: string;
  path?: string;
  repository?: string;
  socket_io?: {
    reconnection?: boolean;
    reconnectionAttempts?: number;
    reconnectionDelay?: number;
    reconnectionDelayMax?: number;
    randomizationFactor?: number;
    forceNew?: boolean;
    autoConnect?: boolean;
    transports?: string[];
    query?: {
      token: string,
      SDK_version: string,
      session_version:string,
      OS_family: string,
      OS_revision: string
    }
  };
  SDK_version?: string,
  sync?: string;
  url?: string;
  iceServers?: [];
  rtcstats?: RTCStatsConfig;
  conversations_page_config?: {
    page_size: number;
    order: string;
    cursor: string;
  };
  events_page_config?: {
    page_size: number;
    order: string;
    event_type: string;
  };
  token?: string | null;
  [key: string]: any;
}

export interface RTCStatsConfig {
  remote_collection_url?: string;
  remote_collection?: boolean;
  remote_collection_interval?: number;
  emit_events?: boolean;
  emit_rtc_analytics?: boolean;
  emit_interval?: number;
}

export interface InviteParams {
  id?: string;
  user_name?: string;
  media?: {
    audio_settings: {
      enabled?: boolean;
      earmuffed?: boolean;
      muted?: boolean;
    };
  };
}

export interface PrewarmResponse {
  stream: MediaStream;
  legId: string;
  rtcObjects: RtcObjects;
}

export interface PostLegResponse {
  rtc_id: string;
  sdp: string;
}

export interface RtcObjects {
  [key: string]: {
    rtc_id: string;
    pc: RTCPeerConnection;
    stream: MediaStream;
    type: string;
    streamIndex: number;
  }
}

export interface MosReport {
  min: string;
  max: string;
  last?: string;
  average?: string;
}

export interface RTCStatsAnalyticsParams {
  application: Application;
  conversation?: Conversation;
  pc: RTCPeerConnection;
  rtc_id: string;
  config: RTCStatsConfig;
}

export interface MediaHandlerContext {
  application: Application;
  pc: any;
  conversation?: Conversation;
  streamIndex?: number;
  log?: Logger;
  localStream?: MediaStream;
  rtcObjects?: RtcObjects;
  reconnectRtcId?: string;
  resolve?: (value?: PromiseLike<MediaStream> | MediaStream) => void;
  reject?: (reason?: any) => void;
}

export interface LogLevel {
  TRACE: 0;
  DEBUG: 1;
  INFO: 2;
  WARN: 3;
  ERROR: 4;
  SILENT: 5;
}

export type MethodFactory = (methodName: string, level: LogLevelNumbers, loggerName: string) => LoggingMethod;

export type LogLevelNumbers = LogLevel[keyof LogLevel];

export type LoggingMethod = (...message: any[]) => void;

export type LogLevelDesc = LogLevelNumbers
| 'trace'
| 'debug'
| 'info'
| 'warn'
| 'error'
| 'silent'
| keyof LogLevel;

export interface Logger {
  readonly levels: LogLevel;

  methodFactory: MethodFactory;
  trace(...msg: any[]): void;
  debug(...msg: any[]): void;
  info(...msg: any[]): void;
  warn(...msg: any[]): void;
  error(...msg: any[]): void;
  setLevel(level: LogLevelDesc, persist?: boolean): void;
  getLevel(): LogLevel[keyof LogLevel];
  setDefaultLevel(level: LogLevelDesc): void;
  enableAll(persist?: boolean): void;
  disableAll(persist?: boolean): void;
}

export interface EventEmbeddedInfo {
  from_user?: {
    id?: string;
    name?: string;
    display_name?: string;
    image_url?: string;
    custom_data?: Object;
  },
  from_member: {
    id?: string;
    name?: string;
    display_name?: string;
    image_url?: string;
    custom_data?: Object;
  }
}

export interface ConversationMemberInfo {
  memberId: string;
  userId?: string;
  userName?: string;
  displayName?: string;
  imageUrl?: string;
  customData?: Object;
}

export interface MessageEventParams {
  message_type: string;
  text?: string;
  image?: {
    url: string;
  };
  audio?: {
    url: string;
  };
  video?: {
    url: string;
  };
  file?: {
    url: string;
  };
}

export type NetworkRequestResponse =
  | XMLHttpRequest
  | NexmoServers
  | MediaServerInfo[];

export interface NexmoServers {
  [key: string]: {
    endpoint: string;
    https: string;
    ws: string;
  };
}

export interface Report {
  machineInfo: {
    ip: string;
  };
  connectivityReport: ConnectivityReport[];
}

export interface ConnectivityReport {
  name: string;
  signalConnectionReport: SignalConnectionReport;
  mediaConnectionReport: MediaConnectionReport[];
}

export interface SignalConnectionReport {
  https: HttpsSignalConnectionReport;
  ws: WsSignalConnectionReport;
}

export interface HttpsSignalConnectionReport {
  url: string;
  canConnect: boolean;
  connectionTime?: number;
  error?: string;
}

export interface WsSignalConnectionReport {
  url: string;
  canConnect: boolean;
  connectionTime?: number;
  error?: object;
}

export interface MediaConnectionReport {
  ip: string;
  canConnect: boolean;
  connectionTime?: number;
  error?: object;
}

export interface MediaServerInfo {
  ip: string;
  port: number;
}

export interface PublicIpOptions {

  onlyHttps?: boolean;

  timeout?: number;

  fallbackUrls?: string[];
}

export type PublicIpFunction = (options?: any) => Promise<string>
