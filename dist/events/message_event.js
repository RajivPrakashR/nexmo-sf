'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Nexmo Client SDK
 *  Message NXMEvent Object Model
 *
 * Copyright (c) Nexmo Inc.
*/
const loglevel_1 = require("loglevel");
const utils_1 = __importDefault(require("../utils"));
const nxmEvent_1 = __importDefault(require("./nxmEvent"));
const nexmoClientError_1 = require("../nexmoClientError");
/**
 * A message event
 *
 * @class MessageEvent
 * @extends NXMEvent
*/
class MessageEvent extends nxmEvent_1.default {
    constructor(conversation, params) {
        super(conversation, params);
        this.log = loglevel_1.getLogger(this.constructor.name);
        this.type = 'message';
        this.conversation = conversation;
        this.state = {
            seen_by: {},
            delivered_to: {},
            submitted_to: {},
            rejected_by: {},
            undeliverable_to: {}
        };
        if (params && params.body && params.body.timestamp) {
            this.timestamp = params.body.timestamp;
        }
        Object.assign(this, params);
    }
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
    seen() {
        return super.seen();
    }
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
    delivered() {
        return super.delivered();
    }
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
    del() {
        return super.del();
    }
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
    async fetchImage() {
        if (this.body.message_type !== "image") {
            throw new nexmoClientError_1.NexmoClientError('error:message-event:invalid');
        }
        try {
            return utils_1.default._fetchImage(this.body.image.url, this.conversation.application.session.config.token);
        }
        catch (error) {
            this.log.error(error);
            throw error;
        }
    }
}
exports.default = MessageEvent;
module.exports = MessageEvent;
