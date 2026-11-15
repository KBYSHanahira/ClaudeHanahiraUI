# Platform and release

A look-up for platform features that need several pieces to line up, and for shipping to the stores. Store policies, required SDK levels and review rules change often; check the current App Store Connect and Play Console docs before relying on any specific rule.

## Permissions

- Ask at the moment the feature needs it, after explaining why in the app's own UI.
- Handle every state: not asked, granted, denied, denied permanently, limited (partial photo or approximate location). Each needs a working screen.
- On permanent denial, offer a button to the app's settings page; the OS permission dialog will not show again.
- iOS: every protected API needs its usage description string in `Info.plist`, or the app crashes on access.
- Android: declare in the manifest and request at runtime for dangerous permissions; some (background location, exact alarms, notifications) have extra rules on newer versions.
- Re-check permission on resume; the user can change it in settings at any time.

## Push notifications

- iOS (APNs): the Push Notifications capability, a key or certificate uploaded to the push provider, the right environment (sandbox for debug, production for release), and permission granted.
- Android (FCM): the Firebase config file in the app, the notification permission on newer versions, and a notification channel.
- The app registers, receives a device token and sends it to the backend; tokens change, so send updates.
- Handle three cases: received in foreground, received in background, and opened by tapping.
- Test on a real device; simulators and emulators support push only partly.
- When nothing arrives, check in order: permission, token reaches backend, provider credentials, environment, payload format.

## Deep links

- Custom schemes (`myapp://`) work without verification but any app can claim them.
- iOS universal links: the Associated Domains entitlement plus `apple-app-site-association` served over HTTPS at `/.well-known/`, no redirect, correct content type, with the right team and bundle IDs.
- Android app links: `autoVerify` intent filters plus `assetlinks.json` at `/.well-known/` with the package name and signing certificate fingerprint. The release key's fingerprint differs from the debug key's; include both if needed.
- Test cold start and warm start separately; links often work in one only.
- Route through one handler so links and push taps share the same navigation code.

## Secure storage

- Tokens, refresh tokens and keys go in Keychain (iOS) or Keystore-backed storage (Android), through `expo-secure-store`, `react-native-keychain`, `flutter_secure_storage` or native APIs.
- Never in AsyncStorage, SharedPreferences, UserDefaults or plain files.
- Decide what happens on reinstall: Keychain items can survive app removal on iOS.
- Clear secure storage on logout.

## Release checklist: App Store

- Bump the build number; set the marketing version.
- Archive the release configuration with the distribution certificate and profile.
- Upload dSYMs to the crash reporter.
- Fill privacy details and the data-use declarations to match what the app actually collects.
- Add review notes and a demo account for anything behind a login.
- Use TestFlight first; then phased release.

## Release checklist: Google Play

- Bump `versionCode`; set `versionName`.
- Build a signed app bundle; Play App Signing holds the app key, the upload key signs the upload.
- Upload the R8 mapping file and native symbols.
- Complete the data safety form and content rating.
- Use internal or closed testing tracks first, then a staged rollout.

## Staged rollouts

- Start small, watch crash-free users, ANRs and key metrics, then widen.
- Know how to halt: Play can halt a rollout; App Store phased release can be paused. Neither recalls installed builds, so a fix needs a new version.

## Crash symbolication

- iOS: keep the dSYM for every build shipped; without it stack traces are addresses.
- Android: keep the `mapping.txt` from R8 and native `.so` symbols for each version.
- Automate the upload in the release pipeline so no build ships without them.
- Check one test crash from a release build is readable before trusting the setup.

## Over-the-air updates

- EAS Update, CodePush successors and Shorebird ship JS or Dart changes without a store review.
- They cannot change native code, permissions, entitlements or the native runtime version; those need a store build.
- Pin updates to a runtime or native version so an update never loads on a binary it does not match.
- Store rules limit what OTA may change; check the current policy before shipping features this way.
- Keep a rollback path and roll out OTA updates in stages too.
