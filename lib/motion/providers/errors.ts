export class VideoProviderTimeoutError extends Error{constructor(){super("VIDEO_PROVIDER_TIMEOUT");this.name="VideoProviderTimeoutError";}}
export class VideoProviderRefusalError extends Error{constructor(){super("VIDEO_GENERATION_DECLINED");this.name="VideoProviderRefusalError";}}
export class VideoProviderMalformedResponseError extends Error{constructor(){super("INVALID_PROVIDER_RESPONSE");this.name="VideoProviderMalformedResponseError";}}
export class VideoProviderTransientError extends Error{constructor(){super("VIDEO_PROVIDER_TRANSIENT");this.name="VideoProviderTransientError";}}
