# Vonage Client SDK for JavaScript

[![Twitter](https://img.shields.io/badge/twitter-@Vonage-blue.svg?style=flat)](https://twitter.com/Vonage)

The Client SDK is intended to provide a ready solution for developers to build Programmable Conversation applications across multiple Channels including: Messages, Voice, SIP, websockets, and App.

The following media types are supported:

#### In-App Messaging
- Offline Sync – With built-in caching, messages are saved and sent or received once their device is back online.
- Push Notifications – Keep users aware of important alerts by sending notifications to their device.
- Text and Image Support – Users can quickly send and receive texts and images from your application.

    [Read more about In-App Messaging.](https://developer.nexmo.com/client-sdk/in-app-messaging/overview)

#### In-App Voice
- User Control – Users can control whether their audio stream is muted or unmuted.
- Notifications – Users can be notified when they receive a call or when participants are muted.
- Group Calls – Configure call settings so users can start a group call by adding participants in real time.

    [Read more about In-App Voice.](https://developer.nexmo.com/client-sdk/in-app-voice/overview)

## Tutorials
See how the Client SDK is used in the following tutorials:
- [Making an app to app voice call](https://developer.nexmo.com/client-sdk/tutorials/app-to-app/introduction/javascript)
- [Making an in-app voice call](https://developer.nexmo.com/client-sdk/tutorials/app-to-phone/introduction/javascript)
- [Creating a web-based chat app](https://developer.nexmo.com/client-sdk/tutorials/in-app-messaging/introduction/javascript)
- [Receiving a phone call in-app](https://developer.nexmo.com/client-sdk/tutorials/phone-to-app/introduction/javascript)


## Installation

### [NPM](http://npmjs.com)

A dependency manager for Node packages. You can install the Client SDK with the following command:

```bash
npm install nexmo-client
```

## SDK Setup

Include the `nexmoClient.js` script in your web page

```HTML
<script src="node_modules/nexmo-client/dist/nexmoClient.js"></script>
```

Or the minified version

```HTML
<script src="node_modules/nexmo-client/dist/nexmoClient.min.js"></script>
```

## Testing

We use third party tools for testing the framework:

- [Karma](https://karma-runner.github.io/1.0/index.html): Karma is our test runner
- [Mocha](https://mochajs.org/): Mocha is a feature-rich JavaScript test framework running on Node.js and in the browser, making asynchronous testing simple and fun.
- [Chai](http://chaijs.com/): Chai is a BDD / TDD assertion library for node and the browser that can be delightfully paired with any javascript testing framework.

## Code style & Conventions

- https://github.com/google/eslint-config-google

## License

Copyright (c) 2020 Vonage, Inc. All rights reserved. Licensed only under the Vonage Client SDK License Agreement (the "License") located at [LICENCE](https://github.com/nexmoinc/conversation-js-sdk/blob/master/LICENSE).

By downloading or otherwise using our software or services, you acknowledge that you have read, understand and agree to be bound by the Vonage Client SDK License Agreement and Privacy Policy.

You may not use, exercise any rights with respect to or exploit this SDK, or any modifications or derivative works thereof, except in accordance with the License.

[<img src="https://developer.nexmo.com/images/logos/vbc-logo.svg" width="30%">](https://www.vonage.com/communications-apis/)
