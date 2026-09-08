# FE #160 — V3 release baseline reconciliation

## Candidate, not deployed state

The V3 integration target remains `redesign/mvp-v0.8-ui`, starting at
`d78c3b327183b352d524428122cbaf3764a73e41`. This branch is an isolated,
reviewable successor, paired with BE `main` at
`9b67d58a43dcc682d813bf414e1b938639a0f66b`.
The final submitted FE SHA and command results belong in the existing workspace
V3-023 evidence (`.agent-artifacts/v3-023/release-baseline-20260908/`),
not an independently maintained release/task registry.

No APK, installed build, staging smoke or deployed source has been verified by
this change. Build identifier and deployed state are **unknown**. Source-level
checks are not device evidence. No product flags, deployment settings or paid
provider configuration are changed. Visual fixtures use the existing fake
provider and do not establish visual quality or product value.

## Content audit (2026-09-08)

FE main is `a55f7ad7bea58e59ae07e2a74a54b9dbe2db5047`. The 3/64 divergence
counts ancestry, not missing features. The disposition of the three main-only
commits is:

| Main commit | Content disposition |
| --- | --- |
| `ac13d8b` (#90, squash of the V2 track) | Do not replay the squash. The reason builder and tests, FirstOutfit navigation, WardrobeList focus/navigation behavior, auth API and root navigation have identical Git blobs on main and V3. Later V3 changes are retained, not overwritten by the older squash. |
| `4caa1a1` (#131) | Restore order-screenshot picker, entry and translations. Adapt the existing V3 import pipeline rather than replacing it: both `outfit_image` and `order_screenshot` survive, with explicit input type carried into confirmation. |
| `a55f7ad` (#132) | Restore nullable recommendation identity/revision mapping on Today and FirstOutfit, impression dedupe and plain-swap attribution. Keep V3 applied-context captions, failure messages, weather and disabled-swap handling. |

The reason mapper in `src/api/recommendations.ts` was already equal between
the two refs; that file's difference was identity propagation, not explanation
semantics. The regression executes the shipped mapper for both identity-bearing
and legacy responses instead of only asserting that types exist.

The opposite direction remains based on V3: navigation into Should I Buy,
avatar consent/revoke, purchase-decision parsing, preview fallback and ImageThumb
render-loop fixes are not replaced. Shared OpenAPI, P0 contract, analytics and
rollout artifacts remain paired with the specified BE ref. No blind merge,
reset, branch deletion or force push is part of this reconciliation.

## Sharing and telemetry disposition

FE #159 (`feat/outfit-share-asset`, based on main) and BE #163 are existing,
separately owned sharing work and **excluded from this candidate**. Their CI or
legacy Today coverage is not evidence of the active V2/V3 Today surface. Shipping
that optional slice requires its own correctness review and later V3 integration.

FE #157 must start from this reconciled V3 successor, not FE main. Preserve the
seven FE-owned and four BE-owned events; an FE-only dispatcher is not the
cross-repo join. The existing `telemetry_sink` prerequisite stays unmet until
queryable joined-flow evidence and the retention/access/privacy approvals exist.

## Validation and remaining gates

Local scope is bounded tests, typecheck, changed-file lint and `./init.sh contract`
with explicit paired worktree overrides. The existing pull-request workflow runs
the full FE suite; no local full build/test suite is required by this patch.
CI must actually execute on the submitted head. A zero-step failure is not a pass.

Still required before release: exact build/source/flags/provider identification;
V2 flag-off and V3 flag-on device navigation; decision parsing; avatar revoke and
re-enable; failed-preview fallback; ImageThumb stability; recommendation revision
attribution; review of the path back to main. None is silently discharged here.
A separately approved qualitative decision-only study is distinct from a
telemetry-backed quantitative rollout and from a paid visual beta.
