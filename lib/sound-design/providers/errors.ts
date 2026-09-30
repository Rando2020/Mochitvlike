export class SoundProviderTimeoutError extends Error{constructor(){super("SOUND_PROVIDER_TIMEOUT");this.name="SoundProviderTimeoutError";}}
export class SoundProviderRefusalError extends Error{constructor(){super("SOUND_GENERATION_DECLINED");this.name="SoundProviderRefusalError";}}
export class SoundProviderMalformedResponseError extends Error{constructor(){super("INVALID_SOUND_RESPONSE");this.name="SoundProviderMalformedResponseError";}}
export class SoundProviderTransientError extends Error{constructor(){super("INTERNAL_TRANSIENT");this.name="SoundProviderTransientError";}}
