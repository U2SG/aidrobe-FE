# Aidrobe iOS Client

React Native + Expo Dev Client + TypeScript implementation of the Aidrobe iOS client.

This repository is the client companion to the FastAPI backend in `D:\project\Python\aidrobe`. It is currently implemented with Expo/React Native rather than a native SwiftUI project.

## Current Status

Implemented and wired to the backend API:

- Onboarding flow with optional Apple Sign In in production.
- Development auth fallback using `X-User-Id` with a UUID value.
- Secure token storage for production access/refresh tokens.
- User settings: departure time and push notification switch.
- Today screen with scene chips: commute, formal, casual.
- Outfit detail, mark-worn action, feedback with reason tags.
- Wardrobe list, detail, edit, soft delete.
- Add item flow: image picker/camera, compression, presigned upload, import task creation, import confirmation.
- API DTO mapping for backend snake_case responses.

Known limitations:

- This project needs macOS + Xcode to run `pnpm ios`.
- Apple Sign In only appears in production mode; development mode uses the backend's `X-User-Id` shortcut.
- Push token registration UI is present at the settings-contract level, but native APNs registration still needs a production provisioning pass.
- Outfit item thumbnails in recommendation cards are placeholders because the current outfit-detail backend response does not include full image URLs per outfit item.

## Setup

```bash
pnpm install
copy .env.development.example .env.development
pnpm start
```

For iOS native execution:

```bash
pnpm prebuild
pnpm ios
```

The current development server runs on:

```text
http://localhost:8081
```

## Environment

`.env.development.example`:

```env
APP_ENV=development
API_BASE_URL=http://localhost:8000
DEV_USER_ID=00000000-0000-4000-8000-000000000001
```

`DEV_USER_ID` must be a UUID because the backend validates `X-User-Id`.

## Project Structure

```text
src/
  api/                 Axios client and endpoint modules
  core/navigation/      Root, tab, and stack navigators
  core/providers/       React Query provider
  components/          Cards, feedback states, buttons, layout
  hooks/               useTrack
  screens/
    onboarding/        Welcome, permission, departure time
    today/             Today, outfit detail, feedback
    wardrobe/          List, detail, add, import confirm/failure
    settings/          Settings
  store/               Zustand stores for auth, onboarding, dev user, toast, import draft
  types/               API DTOs and navigation types
  utils/               Analytics and image helpers
```

## Backend Contract

The client currently calls these backend routes:

- `POST /v1/auth/login/apple`
- `POST /v1/auth/refresh`
- `GET /v1/user/settings`
- `PATCH /v1/user/settings`
- `POST /v1/uploads/presign`
- `POST /v1/import-tasks`
- `GET /v1/import-tasks/{id}`
- `POST /v1/import-tasks/{id}/confirm`
- `GET /v1/wardrobe-items`
- `GET /v1/wardrobe-items/{id}`
- `PATCH /v1/wardrobe-items/{id}`
- `DELETE /v1/wardrobe-items/{id}`
- `GET /v1/recommendations/today?scene=commute|formal|casual`
- `GET /v1/recommendations/outfits/{id}`
- `POST /v1/recommendations/outfits/{id}/wear`
- `POST /v1/recommendations/outfits/{id}/feedback`

## Verification

Last verified on 2026-05-01:

```bash
pnpm typecheck
pnpm lint
pnpm format
pnpm start -- --host localhost
```

Results:

- TypeScript: passed
- ESLint: passed
- Prettier: applied
- Expo/Metro: started at `http://localhost:8081`
