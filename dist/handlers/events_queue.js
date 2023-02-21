'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Nexmo Client SDK
 * Events Queue
 *
 * Copyright (c) Nexmo Inc.
*/
const nexmoClientError_1 = require("../nexmoClientError");
const utils_1 = __importDefault(require("../utils"));
const loglevel_1 = require("loglevel");
/**
 * Handle Mapping of Conversation Ids to ConversationEventsProcessor
 *
 * @class EventsQueue
 * @private
 */
class EventsQueue {
    constructor(callback) {
        this.callback = callback;
        this.cidMap = new Map();
        this.log = loglevel_1.getLogger(this.constructor.name);
    }
    // enqueue(item)
    async enqueue(event, application) {
        var _a, _b, _c, _d;
        //Check if cid or event id and if not just send to application to be processed
        const { cid, id } = event;
        const eventId = Number(id);
        if (!cid || isNaN(eventId))
            return this.callback(event);
        // Check if Conversation Events Queue for CID and if not create one
        if (!this.cidMap.get(cid)) {
            this.log.debug(`enqueue: create new ConversationEventsProcessor for ${cid}`);
            const newConversationEventsProcessor = new ConversationEventsProcessor(cid, eventId - 1, application);
            // edge case for member:media or  member:joined event before transfer or member:joined && channel:id
            if (event.type == 'member:media' && ((_b = (_a = event.body) === null || _a === void 0 ? void 0 : _a.media) === null || _b === void 0 ? void 0 : _b.audio) ||
                event.type == 'member:joined' && ((_d = (_c = event.body) === null || _c === void 0 ? void 0 : _c.channel) === null || _d === void 0 ? void 0 : _d.id)) {
                //fetch last 20 events of conversation & if there is a transfer to this converstaion
                const startingFetchEventId = eventId - 20 < 1 ? 1 : eventId - 20;
                const events = await newConversationEventsProcessor.fetchConversationEvents(startingFetchEventId, 20);
                let transferEventFound = false;
                events.forEach(fetchedEvent => {
                    if (fetchedEvent.type === 'rtc:transfer' && fetchedEvent.from === event.from) {
                        transferEventFound = true;
                        // reset the events processor to process transfer event next
                        newConversationEventsProcessor.lastEventIdProcessed = Number(fetchedEvent.id) - 1;
                    }
                    if (transferEventFound) {
                        //Enqueue all events after rtc:transfer event found
                        newConversationEventsProcessor.enqueue(Number(fetchedEvent.id), fetchedEvent);
                    }
                });
            }
            this.cidMap.set(cid, newConversationEventsProcessor);
        }
        const conversationEventsProcessor = this.cidMap.get(cid);
        // Add new event to conversation events queue
        conversationEventsProcessor.enqueue(eventId, event);
        // If not currently processing events in queue begin processing
        if (!conversationEventsProcessor.processing) {
            conversationEventsProcessor.processing = true;
            const processingEvents = await conversationEventsProcessor.processEvents();
        }
        return;
    }
}
exports.EventsQueue = EventsQueue;
/**
 * Handle Ordering of Conversation Events for Processing
 *
 * @class ConversationEventsProcessor
 * @private
 */
class ConversationEventsProcessor {
    constructor(cid, lastEventIdProcessed, application) {
        this.cid = cid;
        this.eventsMap = new Map();
        this.callback = (event) => application._handleEvent(event);
        this.lastEventIdProcessed = lastEventIdProcessed;
        this.largestEventIdInQueue = lastEventIdProcessed;
        this.processing = false;
        this.application = application;
        this.eventsFetchRange = 9;
        this.log = loglevel_1.getLogger(this.constructor.name);
    }
    enqueue(eventId, event) {
        if (eventId > this.largestEventIdInQueue)
            this.largestEventIdInQueue = eventId;
        if (eventId > this.lastEventIdProcessed)
            this.eventsMap.set(eventId, event);
        return event;
    }
    dequeue(eventId) {
        const event = this.eventsMap.get(eventId);
        this.eventsMap.delete(eventId);
        return event;
    }
    async processEvents() {
        const doneProcessing = () => {
            this.eventsMap.clear();
            this.log.debug(`processEvents: Done Processing`);
            return this.processing = false;
        };
        if (this.eventsMap.size < 1)
            return doneProcessing();
        const nextEventToProcess = this.lastEventIdProcessed + 1;
        const processedEvent = await this.processNextEvent(nextEventToProcess);
        if (processedEvent) {
            this.lastEventIdProcessed = Number(processedEvent.id);
            return this.processEvents();
        }
        else {
            return doneProcessing();
        }
    }
    async processNextEvent(eventId) {
        this.log.debug(`processNextEvent: processing event number ${eventId}`);
        const event = this.dequeue(eventId);
        try {
            if (event) {
                await this.callback(event);
                return event;
            }
            else {
                // The next event in the sequence was not in the map, if larger event id in queue (gap)
                // make a request to CS to get all conversation events and add any missed
                if (this.largestEventIdInQueue > eventId) {
                    this.log.debug(`processNextEvent: largestEventIdInQueue-${this.largestEventIdInQueue} > eventId-${eventId}`);
                    const foundEvent = await this.fetchEventsAndProcess(eventId);
                    if (foundEvent) {
                        this.log.debug("processNextEvent: foundEvent ", { foundEvent });
                        await this.callback(foundEvent);
                        return foundEvent;
                    }
                    else {
                        this.log.debug(`processNextEvent: not found process next ${eventId + 1}`);
                        return this.processNextEvent(eventId + 1);
                    }
                }
                return;
            }
        }
        catch (e) {
            return;
        }
    }
    async fetchEventsAndProcess(missingEvent) {
        //fetch conversation events
        try {
            const eventsList = await this.fetchConversationEvents(missingEvent, this.eventsFetchRange);
            this.log.debug("fetchEventsAndProcess: fetched events list ", { eventsList });
            //check for next event id
            let foundEvent;
            eventsList.forEach((event) => {
                //add cid back to fetched event
                event.cid = this.cid;
                const eventId = Number(event.id);
                if (isNaN(eventId) || eventId < missingEvent)
                    return;
                if (eventId > missingEvent) {
                    this.log.debug(`fetchEventsAndProcess: event > missingEvent ${eventId} `, { missingEvent });
                    this.enqueue(eventId, event);
                }
                else {
                    this.log.debug("fetchEventsAndProcess: foundEvent ", { event });
                    foundEvent = event;
                }
            });
            return foundEvent;
        }
        catch (e) {
            this.log.debug("fetchEventsAndProcess: error ", { e });
            return;
        }
    }
    async fetchConversationEvents(start_id, range) {
        this.log.debug("fetchConversationEvents: ", this.cid, start_id);
        // from & to by event id to restrict
        const end_id = this.largestEventIdInQueue > start_id ? this.largestEventIdInQueue + range : start_id + range;
        const url = `${this.application.session.config.nexmo_api_url}/beta2/conversations/${this.cid}/events`;
        try {
            const response = await utils_1.default.paginationRequest(url, { start_id, end_id }, this.application.session.config.token);
            const eventsList = response.items;
            return eventsList;
        }
        catch (error) {
            throw new nexmoClientError_1.NexmoApiError(error);
        }
    }
}
exports.ConversationEventsProcessor = ConversationEventsProcessor;
module.exports = {
    EventsQueue: EventsQueue,
    ConversationEventsProcessor: ConversationEventsProcessor
};
