export class TTSProviderTimeoutError extends Error{constructor(){super("TTS_PROVIDER_TIMEOUT");this.name="TTSProviderTimeoutError";}}
export class TTSProviderRefusalError extends Error{constructor(){super("TTS_GENERATION_DECLINED");this.name="TTSProviderRefusalError";}}
export class TTSProviderMalformedResponseError extends Error{constructor(message="INVALID_TTS_RESPONSE"){super(message);this.name="TTSProviderMalformedResponseError";}}
export class TTSProviderTransientError extends Error{constructor(message="INTERNAL_TRANSIENT"){super(message);this.name="TTSProviderTransientError";}}
