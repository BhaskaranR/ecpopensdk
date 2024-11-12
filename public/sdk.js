/**
 * CUSTOM ECP SDK
 * 
 * This file corresponds to a basic implementation of a Symphony ECP SDK.
 * 
 * SDK features:
 * - render chat in iframe
 * - update a existing iframe to render another chat
 * - update all the rendered chat settings
 * - send message
 * - listen to message notifications (unread and new)
 */

// ---------
// CONSTANTS
// ---------

const ECP_MAIN_PATH = '/apps/embed/default';
const ECP_CHILD_PATH = '/apps/embed/default/frame-root.html';
const MAIN_FRAME_ID = 'symphony-main-frame';
const MAIN_FRAME_CONTAINER = 'symphony-main-frame-container';
const DEFAULT_SETTINGS = 'allowChatCreation=true&canAddPeople=false&canClickExternalLinks=false&canClickInternalLinks=false&condensed=true&condensedMessageBelowName=true&ecpLoginPopup=false&mode=light&showAttach=true&showBookmarkMessage=true&showChatSearch=true&showCompose=true&showDisableInput=true&showEditor=true&showEmoji=true&showInfo=true&showMembers=true&showHashTagPopover=false&showCashTagPopover=true&showProfilePopover=true&showSuppressMessage=true&showSystemMessages=false&showTitle=true&showXPod=true&sound=false&storageAccessPrompt=false&symphonyLogo=true';

// ---------
// VARIABLES
// ---------

let sdkConfiguration = {};
let isMainFrameLoaded = false;
let childFrameCount = 0;
let subscriptionCallbacks = {}; // { [id]: callbackFn }
let actionId = 0;

// --------------
// FRAME HANDLING
// --------------

const iframeContainer = (iframe, id) => {
    const iframeContainer = document.createElement('div');
    if (id) {
        iframeContainer.id = id;
    }
    iframeContainer.className = "frame-container";
    iframeContainer.appendChild(iframe);
    return iframeContainer;
}

const initMainFrame = (streamId, containerId) => {
    const { podUrl, partnerId } = sdkConfiguration;
    const container = document.getElementById(containerId);

    if (!container) {
        throw new Error(`Container with id "${containerId}" not found`);
    }

    // create main frame
    const iframe = document.createElement('iframe');
    const iframeUrl = new URL(`${podUrl}${ECP_MAIN_PATH}?${DEFAULT_SETTINGS}`);
    iframeUrl.searchParams.append("embed", "true");
    iframeUrl.searchParams.append("partnerId", partnerId);
    iframeUrl.searchParams.append("streamId", streamId);
    iframeUrl.searchParams.append("sdkOrigin", window.location.origin);
    iframe.src = iframeUrl.href;
    iframe.id = MAIN_FRAME_ID;
    iframe.style.height = '100%';
    iframe.style.width = '100%';

    // inject the main frame
    container.appendChild(iframeContainer(iframe));
}

const initChildFrame = (streamId, containerId) => {
    const { podUrl } = sdkConfiguration;
    const container = document.getElementById(containerId);

    // compute ids
    const frameId = childFrameCount++;
    const frameContainerId = `symphony-child-${frameId}`;

    // create the iframe
    const iframe = document.createElement('iframe');
    const iframeUrl = new URL(`${podUrl}${ECP_CHILD_PATH}`);
    iframeUrl.hash = frameContainerId;
    iframe.src = iframeUrl.href;
    iframe.style.height = '100%';
    iframe.style.width = '100%';

    // when the iframe is loaded, register it to ECP and then render the desired chat
    iframe.addEventListener(
        'load',
        () => {
            postEcpMessage('sdk-register', { iFrameId: frameContainerId })
            setStream(streamId, frameContainerId);
        },
        { once: true },
    );

    // inject the iframe
    container.appendChild(iframeContainer(iframe, frameContainerId));
}

// -----------------
// ECP COMMUNICATION
// -----------------

const postEcpMessage = (eventType, payload) => {
    const { podUrl } = sdkConfiguration;
    const iframe = document.getElementById(MAIN_FRAME_ID);
    return iframe.contentWindow.postMessage({ eventType, payload }, podUrl);
};

const onEcpMessage = (e) => {
    const { podUrl, onReady } = sdkConfiguration;
    if (e.origin !== podUrl) {
        return;
    }

    const { eventType, payload } = e.data;

    switch (eventType) {
        case 'clientReady': {
            console.log(`SDK is ready !`);
            isMainFrameLoaded = true;
            onReady?.();
            break;
        }

        case 'sdk-resolve': {
            if (payload?.data?.error) {
                const { type, message } = payload.data.error;
                const errorMessage = `[${type}] ${message}`;
                console.error(errorMessage);
                alert(errorMessage);
            } else {
                console.log(`sdk-action with id "${payload.id}" was successful !`);
            }
            break;
        }

        case 'sdk-callback-data': {
            const { id, data } = payload;
            subscriptionCallbacks[id]?.(data);
            break;
        }

        default: {
            console.log(`Received event is not supported: ${eventType}`);
        }
    }
};

// --------
// SDK APIs
// --------

const checkRequiredParams = (params) => {
    const keys = Object.keys(params);
    for (const key of keys) {
        const value = params[key];
        if (!value) {
            const keysStr = keys.join(", ");
            const errorMessage = `This action requires the following parameters: ${keysStr}.`;
            console.error(errorMessage);
            alert(errorMessage);
            return false;
        }
    }
    return true;
}

const openStream = (streamId, containerId) => {
    const { podUrl } = window.sdk.configuration;

    if (!checkRequiredParams({ podUrl, streamId })) {
        return;
    }

    const container = document.getElementById(containerId);
    const isMainFrame = containerId === MAIN_FRAME_CONTAINER;

    if (isMainFrame) {
        if (!isMainFrameLoaded) {
            sdkConfiguration = window.sdk.configuration;
            window.addEventListener('message', onEcpMessage, false);
            initMainFrame(streamId, containerId);
        } else {
            setStream(streamId);
        }
    } else {
        initChildFrame(streamId, containerId);
    }
}

const setStream = (streamId, containerId) => {
    if (!checkRequiredParams({ streamId })) {
        return;
    }

    postEcpMessage('sdk-action', {
        name: 'set-stream',
        id: `set-stream-${++actionId}`,
        params: {
            streamId,
            container: containerId ? `#${containerId}` : undefined
        },
    });
}

const updateSettings = (settings) => {
    if (!checkRequiredParams({ settings })) {
        return;
    }

    postEcpMessage('sdk-action', {
        name: 'set-settings',
        id: `set-settings-${++actionId}`,
        params: settings,
    });
}

const sendMessage = (streamId, message, containerId) => {
    if (!checkRequiredParams({ streamId, message })) {
        return;
    }

    postEcpMessage('sdk-action', {
        name: 'send-message',
        id: `send-message-${++actionId}`,
        params: {
            message,
            options: {
                mode: 'blast',
                streamIds: [streamId],
                container: containerId ? `#${containerId}` : undefined,
            }
        },
    });
}

const onMessageNotification = (callback, streamId) => {
    if (!checkRequiredParams({ callback })) {
        return;
    }

    const message = `Listening to ${streamId || "all the"} message notifications.`;
    alert(message);
    console.log(message);

    const id = 'message-notification-' + streamId;

    postEcpMessage('sdk-subscription', {
        type: 'MessageNotifications',
        id,
        params: { streamId },
    });

    subscriptionCallbacks[id] = callback;
};

const onUnreadCountNotification = (callback, streamId) => {
    if (!checkRequiredParams({ callback })) {
        return;
    }

    const message = `Listening to ${streamId || "all the"} unread message count notifications.`;
    alert(message);
    console.log(message);

    const id = 'unread-notification-' + streamId;

    postEcpMessage('sdk-subscription', {
        type: streamId ? 'UnreadCountNotifications' : 'GlobalUnreadCountNotifications',
        id,
        params: { streamId },
    });

    subscriptionCallbacks[id] = callback;
};

// Inject SDK APIs to be used outside of this file
window.sdk = {
    configuration: {},
    openStream,
    setStream,
    updateSettings,
    sendMessage,
    onMessageNotification,
    onUnreadCountNotification,
};