# P4 CommerceShorts — Remotion preflight gate

This feature reuses the existing LEXI Remotion Worker (`services/remotion/worker.mjs`) instead of installing a second video generation system.

`preflight.mjs` validates the **real ShortScript schema** (`overlayText`, `duration`, `imageIndex`) before composition. It blocks empty scripts/images, malformed URLs, local IP literals, and explicitly denied media rights. It does not contact providers or publish anything.

On the worker, `SHORTS_REQUIRE_RIGHTS_APPROVAL=1` additionally requires `mediaRightsApproved: true` on every claimed job. Because existing jobs may not contain that field, this is opt-in until the order/product ingestion explicitly stores image rights. Without the env gate, missing rights are **unknown**, not verified. Set this flag for rights-enforced production after schema migration.

DNS-rebinding and all upstream external-media fetches must be controlled by allowlisted network egress; URL validation alone is not an SSRF boundary. Actual rendering, subtitles and MP4 playback need the Remotion/Chromium/FFmpeg runtime and a controlled test job.

Tests: `node --test services/remotion/preflight.test.mjs`. Existing `worker.mjs` remains the renderer and uploader; failed preflights use the existing worker failure-report endpoint.
