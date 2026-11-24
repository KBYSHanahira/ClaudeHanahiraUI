---
name: "hanahira-claude-ui-mobile"
description: Hanahira Claude UI companion for mobile apps — React Native, Expo, Flutter, iOS, Android, builds, signing, push, store releases. Load only while Hanahira Claude UI mode is ON, never for the topic alone.
license: "Hanahira Claude UI License 1.0 — Copyright (c) 2026 Hanahira. No modified or rebranded copies. See LICENSE.txt"
---

# Hanahira Claude UI — Mobile

A companion of the core `hanahira-claude-ui` skill: it applies only while the mode is ON, prints nothing of its own, and changes none of the core's rules. It holds what goes wrong most often in this field. Use the lines that bear on the task in hand; none of it is a procedure to walk through.

## The one discipline

**It is seen working on a real device or the right simulator or emulator before it is called done** — on both platforms when the app ships to both. A green build or a passing unit test is not a running app. A store submission, a signing-key change or a release to users is an outward step under the core's rule 2: unless the user named it, show what will ship and ask first.

## What saves the most time

- **The native build log's first error.** Read Xcode's or Gradle's first real error, not the JS red box or the last line of a long failure.
- **Clean caches in the right order, only when evidence points there**: Metro, then pods, then Gradle, then DerivedData. A blanket wipe costs minutes and hides what was wrong.
- **Match tool versions to the project's lock files**: Node, Ruby and CocoaPods, JDK, Gradle wrapper, Flutter SDK, Xcode. Version drift causes most "works on their machine" builds.
- **Read the device log**, not only the bundler console: `adb logcat` on Android, the Xcode console or `xcrun simctl spawn booted log stream` on iOS. Native crashes never reach the JS layer.
- **Debug and release differ.** A bug seen only in release points at minification, Hermes or bytecode, missing permissions in the release manifest, or a different config.

## Builds and signing

- Debug builds use a debug key and dev servers; release builds are minified, signed with the real key and talk to production. Test the release variant before shipping.
- Android signs with a keystore; iOS needs a certificate plus a provisioning profile that matches bundle ID, team and entitlements. Most iOS signing errors are a profile mismatch.
- Never commit keystores, passwords, `.p8`/`.p12` files or service-account JSON. Keep them in the CI secret store or the build service.
- EAS Build and fastlane script signing and uploads; read their config before changing anything by hand.

## Platform behaviour

- Permissions: ask in context, handle "denied" and "denied permanently" as real states, and offer a path to settings. Declare usage strings and manifest entries, or the app crashes or is rejected.
- Background work is limited and differs per platform and OS version; do not assume a timer or socket survives backgrounding.
- Push needs every piece in place: platform credentials, the entitlement or capability, the device token sent to the backend, and handlers for foreground, background and tapped states.
- Deep links: universal links and app links need verification files served from the domain; custom schemes do not but are not verified.
- Lay out inside safe areas (notches, home indicator, cutouts) and check that the keyboard never covers the field being typed into.

## Data and offline

- Pick storage by need: key-value for small settings, SQLite or a local database for records, files for blobs.
- Tokens and secrets go in Keychain or Keystore-backed secure storage, never plain AsyncStorage or SharedPreferences.
- Offline sync needs a conflict rule decided up front (last write wins, server wins, merge) and a queue that survives app restarts.

## Releases

- Bump `versionCode` / build number every upload; the stores reject a repeat.
- Use staged rollout and watch crash-free rate before widening.
- Upload dSYMs and mapping files with each release, or crash reports stay unreadable.
- Give store reviewers notes and a test account for anything behind a login. Check each store's current policies and SDK requirements in their docs; they change yearly.

## Working with tools and other skills

- Pair up: `hanahira-claude-ui-design` for UI (its direction, type, hierarchy and states apply; its CSS does not: use the platform's units, 44pt targets on iOS, 48dp on Android), `hanahira-claude-ui-api` for the backend's contract, `hanahira-claude-ui-backend` for its server code and push delivery, `hanahira-claude-ui-perf` for startup time and jank, `hanahira-claude-ui-devops` for CI builds, `hanahira-claude-ui-security` for login, tokens and signing keys, `hanahira-claude-ui-frontend` for React state and effects in React Native, `hanahira-claude-ui-debug-test` for a crash with no plain cause.
- Helpers follow `references/agents.md` in the core.

Build failures, caches, device logs and release-only bugs: `references/build-and-debug.md`. Permissions, push, deep links, secure storage, store releases and symbolication: `references/platform-and-release.md`.
