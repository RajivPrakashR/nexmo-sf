"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const rtcStatsAdapterParser = require("rtc-stats-adapter");
const calculateMos = require('rtc-stats-adapter/calculate-mos');
const utils_1 = __importDefault(require("../utils"));
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
class RTCStatsAnalytics {
    constructor(context) {
        this.mos_report = { min: 5, max: 0 };
        this._reportsCount = 0;
        this._mosSum = 0;
        this.intervals = [];
        this._deprecationWarningSent = false;
        if (!context || !context.application || !context.rtc_id || !context.pc) {
            return;
        }
        this.conversation = null;
        this.application_id = null;
        this.attachHandlers(context);
        this.startSendingStats(context);
        this.startEmittingStats(context);
    }
    attachHandlers(context) {
        const { pc } = context;
        const onConnectionStateChange = pc.onconnectionstatechange
            ? pc.onconnectionstatechange
            : () => { };
        pc.onconnectionstatechange = (event) => {
            onConnectionStateChange.call(pc, event);
            switch (pc.connectionState) {
                case "disconnected":
                case "failed":
                case "closed":
                    this.removeIntervals();
                    this.emitLastReport(context);
            }
        };
        if (!context.conversation) {
            const application = context.application;
            application.on("member:joined", (member, event) => {
                var _a;
                if ((!this.conversation || !this.application_id) && ((_a = context) === null || _a === void 0 ? void 0 : _a.rtc_id) === event.body.channel.id) {
                    this.conversation = member.conversation;
                    this.application_id = event.application_id;
                }
            });
        }
        else {
            const conversation = context.conversation;
            conversation.on("member:media", (member, event) => {
                var _a;
                if (!this.application_id && ((_a = context) === null || _a === void 0 ? void 0 : _a.rtc_id) === event.body.channel.id) {
                    this.application_id = event.application_id;
                }
            });
        }
    }
    emitLastReport(context) {
        const { application, conversation = null, rtc_id, config: { emit_events, emit_rtc_analytics }, } = context;
        const mos_report = this.getMOSReport();
        const mos = mos_report.last;
        if (mos) {
            if (emit_rtc_analytics) {
                application.emit("rtcstats:analytics", {
                    type: "mos_report",
                    mos,
                    rtc_id,
                    mos_report,
                    api_key: application.session.apiKey,
                    ...(this.application_id && { application_id: this.application_id }),
                    ...(conversation && {
                        conversation_id: conversation.id,
                        conversation_name: conversation.name
                    })
                });
            }
            if (emit_events) {
                if (!this._deprecationWarningSent) {
                    this._deprecationWarningSent = true;
                    console.warn('"rtcstats:report" event is deprecated. Use "rtcstats:analytics" instead');
                }
                /**
                 * @deprecated Use "rtcstats:analytics instead"
                 */
                application.emit("rtcstats:report", mos, null, conversation, mos_report);
            }
        }
    }
    startSendingStats(context) {
        const { application, conversation = null, pc, rtc_id, config: { remote_collection, remote_collection_url, remote_collection_interval, }, } = context;
        if (!remote_collection)
            return;
        const remote_collection_interval_id = setInterval(() => {
            pc.getStats(null).then((report) => {
                var _a;
                const conv = (_a = (conversation !== null && conversation !== void 0 ? conversation : this.conversation), (_a !== null && _a !== void 0 ? _a : null));
                utils_1.default.networkRequest({
                    url: remote_collection_url,
                    type: "POST",
                    data: {
                        ...rtcStatsAdapterParser(report),
                        legId: rtc_id,
                        apiKey: application.session.apiKey,
                        ...(this.application_id && { applicationId: this.application_id }),
                        ...(conv && {
                            conversationId: conv.id,
                            conversationName: conv.name
                        })
                    }
                }).catch(() => { });
            }).catch(() => { });
            if (pc.connectionState === "closed" || pc.signalingState === 'closed') {
                this.removeIntervals();
            }
        }, remote_collection_interval);
        this.intervals.push(remote_collection_interval_id);
    }
    startEmittingStats(context) {
        const { application, conversation = null, pc, rtc_id, config: { emit_events, emit_rtc_analytics, emit_interval }, } = context;
        if (!emit_events && !emit_rtc_analytics)
            return;
        const emit_stats_interval_id = setInterval(() => {
            var _a;
            pc.getStats(null).then((stats) => {
                var _a;
                const mos = this.getMos(stats);
                if (!mos)
                    return;
                const conv = (_a = (conversation !== null && conversation !== void 0 ? conversation : this.conversation), (_a !== null && _a !== void 0 ? _a : null));
                if (emit_rtc_analytics) {
                    application.emit("rtcstats:analytics", {
                        type: "mos",
                        mos,
                        report: stats,
                        rtc_id,
                        api_key: application.session.apiKey,
                        ...(this.application_id && { application_id: this.application_id }),
                        ...(conv && {
                            conversation_id: conv.id,
                            conversation_name: conv.name
                        })
                    });
                }
                if (emit_events) {
                    if (!this._deprecationWarningSent) {
                        this._deprecationWarningSent = true;
                        console.warn('"rtcstats:report" event is deprecated. Use "rtcstats:analytics" instead');
                    }
                    /**
                     * @deprecated Use "rtcstats:analytics instead"
                     */
                    application.emit("rtcstats:report", mos, stats, conversation);
                }
            }).catch(() => { });
            if (pc.connectionState === "closed" || pc.signalingState === 'closed') {
                this.removeIntervals();
                this.emitLastReport({
                    ...context,
                    conversation: (_a = (conversation !== null && conversation !== void 0 ? conversation : this.conversation), (_a !== null && _a !== void 0 ? _a : null))
                });
            }
        }, emit_interval);
        this.intervals.push(emit_stats_interval_id);
    }
    removeIntervals() {
        this.intervals.forEach((interval) => clearInterval(interval));
        this.intervals = [];
    }
    getMos(stats) {
        const mos = calculateMos(stats);
        this.updateMOSReport(parseInt(mos));
        return mos;
    }
    /**
     * Update the mos_report object
     * @param {number} mos the MOS score
     * @returns {object} the report object
     */
    updateMOSReport(mos) {
        this._reportsCount++;
        this._mosSum += mos;
        this.mos_report.last = mos;
        this.mos_report.min = mos < this.mos_report.min ? mos : this.mos_report.min;
        this.mos_report.max = mos > this.mos_report.max ? mos : this.mos_report.max;
        this.mos_report.average = this._mosSum / this._reportsCount;
    }
    /**
     * Update the MOS report object
     * mos_report.min - the minimum MOS value during the stream
     * mos_report.max - the maximum MOS value during the stream
     * mos_report.last - the last MOS value during the stream
     * mos_report.average - the average MOS value during the stream
     * @returns {MosReport} mos_report - a report for the MOS values
     *
     */
    getMOSReport() {
        this.mos_report.min = RTCStatsAnalytics.normaliseFloat(this.mos_report.min);
        this.mos_report.max = RTCStatsAnalytics.normaliseFloat(this.mos_report.max);
        this.mos_report.last = RTCStatsAnalytics.normaliseFloat(this.mos_report.last);
        this.mos_report.average = RTCStatsAnalytics.normaliseFloat(this.mos_report.average);
        return this.mos_report;
    }
    static normaliseFloat(value) {
        return parseFloat(value).toFixed(6);
    }
}
exports.default = RTCStatsAnalytics;
module.exports = RTCStatsAnalytics;
