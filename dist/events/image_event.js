'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Nexmo Client SDK
 *  ImageEvent Object Model
 *
 * Copyright (c) Nexmo Inc.
 */
const utils_1 = __importDefault(require("../utils"));
const loglevel_1 = require("loglevel");
const nxmEvent_1 = __importDefault(require("./nxmEvent"));
/**
 * An image event
 *
 * @class ImageEvent
 * @extends NXMEvent
*/
class ImageEvent extends nxmEvent_1.default {
    constructor(conversation, params) {
        super(conversation, params);
        this.log = loglevel_1.getLogger(this.constructor.name);
        this.type = 'image';
        this.conversation = conversation;
        this.state = {
            seen_by: {},
            delivered_to: {}
        };
        if (params && params.body && params.body.timestamp) {
            this.timestamp = params.body.timestamp;
        }
        Object.assign(this, params);
    }
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
    seen() {
        return super.seen();
    }
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
    delivered() {
        return super.delivered();
    }
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
    async del() {
        await utils_1.default.networkRequest({
            type: 'DELETE',
            url: this.body.representations.original.url,
            token: this.conversation.application.session.config.token
        });
        return super.del();
    }
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
    async fetchImage(type = 'thumbnail', imageRepresentations = this.body.representations) {
        try {
            return utils_1.default._fetchImage(imageRepresentations[type].url, this.conversation.application.session.config.token);
        }
        catch (error) {
            this.log.error(error);
            throw error;
        }
    }
}
exports.default = ImageEvent;
module.exports = ImageEvent;
