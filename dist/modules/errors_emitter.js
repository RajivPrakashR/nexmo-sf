'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Nexmo Client SDK
 *  Errors Emitter
 *
 * Copyright (c) Nexmo Inc.
*/
const loglevel_1 = require("loglevel");
const nexmoClientError_1 = require("../nexmoClientError");
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
class ErrorsEmitter {
    constructor(emitter) {
        this.log = loglevel_1.getLogger(this.constructor.name);
        if (!emitter) {
            throw new nexmoClientError_1.NexmoClientError('no emitter object passed for the Error Emitter');
        }
        this.emitter = emitter;
        this.LISTENER_GROUP = 'NXM-errors';
    }
    /**
     * Detect if the param.type includes error and emit that payload in the LISTENER_GROUP
     * @param param - the payload to forward in the LISTENER_GROUP
     * @param param.type - the type of the event to check if it's an error
    */
    emitResponseIfError(param) {
        if (this._isTypeError(param.type)) {
            return this.emitter.emit(param.type, this.LISTENER_GROUP, param);
        }
        return;
    }
    /**
     * Release Group on the registered emitter (using the namespace LISTENER_GROUP that is set)
    */
    cleanup() {
        return this.emitter.releaseGroup(this.LISTENER_GROUP);
    }
    /**
     * Returns true if the param includes 'error'
     * @param {string} type - the error type to check
    */
    _isTypeError(param) {
        return param.indexOf('error') !== -1;
    }
}
exports.default = ErrorsEmitter;
module.exports = ErrorsEmitter;
