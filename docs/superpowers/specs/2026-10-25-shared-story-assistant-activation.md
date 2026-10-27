# Story assistant: prepared, not operationally connected

This reconstructed candidate provides shared saved-context plumbing, a read-only creator API and a real structured-output adapter tested through an injected SDK transport. It is not a connected live chatbot.

## Deliberately closed runtime
`storyAssistantCapability.enabled` is false and the service uses `disabledStoryAssistantProvider`. Environment variables alone cannot activate it. The disabled path reads only owned saved story data; it does not construct an SDK client, read provider credentials, send a model request or return fixture suggestions as live output.

The adapter specifies `store: false`, fixed instructions separate from untrusted JSON story data, no tools, strict output, 5,000 maximum output tokens, a 30-second timeout and zero retries. These are request bounds, not a total spending cap or proof of story quality.

## Required before live activation
1. Obtain explicit approval for a total test budget, including text calls, and intended model/provider. No budget is assumed.
2. Design and implement durable server-side admission/reservation for that budget, creator/request rate and concurrency limits, and idempotent handling. In-memory counters or output-token limits alone are not deployment-wide budget controls; this infrastructure is outside this change.
3. Add a reviewed server-only SDK client factory after approved admission and securely approved configuration. Wire it into the route without bypassing owner/archive checks, input/context bounds or freshness checks. Do not reuse a global generation-enable flag.
4. Verify existing series/seed RLS and storage in an approved isolated environment. No database migration application or production write is implicitly authorized.
5. Perform authenticated browser and live acceptance: owner/other-user/anonymous access, archive behavior, empty versus failed seeds, save/reload, same-series bible changes, cross-tab changes, cancellation and A→B→A navigation, stale-output rejection and accessible source/error states.
6. Within the approved budget, assess real suggestions across genres, tone and motivation constraints, locked intent versus canon, private future reveals, missing setup and adversarial content. Human review must assess causal fit and meaningful alternatives. Fixture tests cannot establish expert storytelling quality.

## Publication boundary
The user authorized a draft PR, not merge, deployment, spending, credential creation or runtime activation. Source was reconstructed after a local workspace loss and requires new review; the old local commit's approval does not apply to this candidate. Existing mixed Director/Rehearse/Fan samples remain separate and scripted.
