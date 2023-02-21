'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const is_ip_1 = __importDefault(require("is-ip"));
class CancelError extends Error {
    constructor() {
        super('Request was cancelled');
        this.name = 'CancelError';
    }
    get isCanceled() {
        return true;
    }
}
const defaults = {
    timeout: 5000
};
const urls = {
    v4: [
        'https://ipv4.icanhazip.com/',
        'https://api.ipify.org/'
    ],
    v6: [
        'https://ipv6.icanhazip.com/',
        'https://api6.ipify.org/'
    ]
};
const sendXhr = (url, options, version) => {
    const xhr = new XMLHttpRequest();
    let _reject;
    const promise = new Promise((resolve, reject) => {
        _reject = reject;
        xhr.addEventListener('error', reject, { once: true });
        xhr.addEventListener('timeout', reject, { once: true });
        xhr.addEventListener('load', () => {
            const ip = xhr.responseText.trim();
            if (!ip || version === 'v4' ? !is_ip_1.default.v4(ip) : !is_ip_1.default.v6(ip)) {
                reject();
                return;
            }
            resolve(ip);
        }, { once: true });
        xhr.open('GET', url);
        xhr.timeout = options.timeout;
        xhr.send();
    });
    // promise.cancel = () => {
    // 	xhr.abort();
    // 	_reject(new CancelError());
    // };
    return promise;
};
const queryHttps = (version, options) => {
    let request;
    const promise = (async function () {
        const urls_ = [].concat.apply(urls[version], options.fallbackUrls || []);
        for (const url of urls_) {
            try {
                request = sendXhr(url, options, version);
                const ip = await request;
                return ip;
            }
            catch (error) {
                if (error instanceof CancelError) {
                    throw error;
                }
            }
        }
        throw new Error('Couldn\'t find your IP');
    })();
    // promise.cancel = () => {
    // 	request.cancel();
    // };
    return promise;
};
class PublicIp {
}
exports.default = PublicIp;
PublicIp.v4 = (options) => queryHttps('v4', { ...defaults, ...options });
PublicIp.v6 = (options) => queryHttps('v6', { ...defaults, ...options });
module.exports = PublicIp;
