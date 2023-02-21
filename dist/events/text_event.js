'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Nexmo Client SDK
 *  Text NXMEvent Object Model
 *
 * Copyright (c) Nexmo Inc.
*/
const nxmEvent_1 = __importDefault(require("./nxmEvent"));
/**
 * A text event
 *
 * @class TextEvent
 * @extends NXMEvent
*/
class TextEvent extends nxmEvent_1.default {
    constructor(conversation, params) {
        super(conversation, params);
        this.type = 'text';
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
     * Set the textEvent status to 'seen'
     * @returns {Promise}
     * @example <caption>Set the textEvent status to 'seen'</caption>
     *  textEvent.seen().then(() => {
     *    console.log("text event status set to seen");
     *  }).catch((error)=>{
     *	console.log("error setting text event status to seen ", error);
     *  });
     */
    seen() {
        return super.seen();
    }
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
    delivered() {
        return super.delivered();
    }
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
    del() {
        return super.del();
    }
}
exports.default = TextEvent;
module.exports = TextEvent;
