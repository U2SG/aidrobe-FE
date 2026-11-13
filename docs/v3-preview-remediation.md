# V3 preview remediation (FE #160 / #163)

## Source changes

Based on cloud APK source 5aec517, not FE main. Align Expo 57.0.20, React Native
0.86.3, Worklets 0.10.1 and Reanimated 4.5.1 to Expo's published SDK57 bundle.
The supported baseline fixes the documented Hermes memory/startup regressions:
https://expo.dev/changelog/sdk-57#known-regressions

Regenerate pnpm-lock.yaml normally. Explicitly align dom-webview and Metro config
to remove retained SDK56/RN0.85 peer resolutions. Add matching expo-system-ui.
No Doctor check or dependency check is disabled; no Hermes override is introduced.
The internal package becomes 0.3.1 / versionCode 8. Existing profiles' versions and
production flags remain unchanged; upgraded dependencies still need full validation.

## Amap

Cloud V3 native prebuild now fails on a blank/missing AMAP_API_KEY rather than
silently creating a keyless package. Logs confirm metadata presence, never key
values. Non-V3 profiles preserve their earlier fallback behavior.

The original development key was found, but its attempted transfer to EAS was
blocked by the tool safety check. It was NOT retried through another route. An
operator must add AMAP_API_KEY to this project's preview environment as Secret.
Do not place the value in Git, app.extra, evidence or chat. Device validation must
also confirm the key's registered package/signature; manifest presence is not proof.

## Backend

The Tailscale address is still this computer's address. Docker was stopped and all
Aidrobe services were down. Starting the engine caused memory pressure (about 0.4
GiB free) and autostarted three unrelated services; those were stopped again. No
Aidrobe service was started, image rebuilt, data migrated or provider invoked.
Existing stopped containers belong to the older D:/project/Python/aidrobe deployment,
not the pinned V3 source. They cannot be treated as current V3 deployment evidence.

Once adequate resources or an approved test host are available, restore the paired
V3 backend and worker, preserving database/object volumes and provider restrictions.
This patch does not claim service restoration. Production is unchanged.

Run pnpm preflight:phone before installation acceptance. It makes bounded read-only
requests to /healthz, /readyz and /openapi.json, comparing canonical schema hashes
against this FE's paired mirror. Errors never echo input/response payloads. A pass
is schema/health evidence, not exact source, worker/provider or device acceptance.

## Evidence and outstanding gates

Five local targeted files passed: SDK/runtime invariants, synthetic Amap injection,
synthetic backend preflight, preview build profiles and existing readiness checks.
Actual backend preflight FAILED: the service remains unreachable. Dependency
resolution/lock alignment succeeded, but bounded full dependency installation timed
out; do not treat it as a successful SDK57 install, typecheck or native build.

Manual-only .eas/workflows/v3-runtime-check.yml runs frozen install, SDK check,
Expo Doctor, full FE typecheck/lint/tests in EAS cloud. It has no automatic trigger,
deployment, update or app-store submission. Its actual result must be recorded;
a YAML file is not verification evidence. Do not submit a new APK while the key
is still missing or imply runtime/device approval before cloud checks finish.

## Cloud archive reliability

Readback confirmed no workflow run was accepted after the timed-out upload. The
cloud archive now excludes only historical PNG/JPEG/WebP/PDF media under docs/design
and docs/v4-ui (44 files, 55,686,734 bytes), which no runtime/test source references.
Repository files are preserved. Actual assets/, src/assets/, contract JSON/Markdown,
all tests and native modules remain in the upload. The next source-upload attempt
must be observed independently; no execution is claimed from an upload log alone.
