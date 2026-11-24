# Build and debug

A look-up for when a mobile build fails or a bug resists the plain method. Read the first real error, change one thing, rebuild. Tool versions and minimum SDK levels change often; check the platform's current docs and the project's lock files rather than trusting a remembered number.

## Before touching anything

- Note the exact versions in use: Node, package manager, Ruby, CocoaPods, JDK, Gradle wrapper, Android Gradle Plugin, Xcode, Flutter. Compare them with the lock files and CI config.
- Ask what changed: a dependency bump, an OS or Xcode update, a new native module, a config plugin.
- Run the build from the command line once; IDE output often hides the first error.

## CocoaPods (iOS)

- "Unable to find a specification" or version conflicts: run `pod repo update`, then `pod install` from `ios/`.
- A stale `Podfile.lock` after a JS dependency change: run `pod install` again; commit the lock file.
- Apple silicon architecture errors: check the Ruby and CocoaPods install, not the app code.
- Build fails after a module rename or removal: if a plain `pod install` does not fix it, delete `ios/Pods` and run it again; keep `Podfile.lock` (deleting it re-resolves every pod version).
- Always open the `.xcworkspace`, not the `.xcodeproj`.

## Gradle (Android)

- Read the first `What went wrong:` block; rerun with `--stacktrace` or `--info` for detail.
- JDK mismatch is common: check `java -version` against what the Gradle wrapper and plugin expect.
- Duplicate class or dependency resolution errors: run `./gradlew app:dependencies` and find the two paths.
- Manifest merger failures: read the merged manifest report under `build/` to see which library adds the conflicting entry.
- Out-of-memory in the daemon: raise `org.gradle.jvmargs` in `gradle.properties`.

## Metro and React Native

- "Unable to resolve module": check the import path, then restart with `npx react-native start --reset-cache` or `npx expo start -c`.
- Native module "null" or not found: the native build is stale; rebuild the app, not just reload JS.
- Expo with config plugins: run `npx expo prebuild --clean` after changing native config; do not hand-edit generated folders that prebuild owns.
- Run `npx expo-doctor` or `npx react-native doctor` to catch version mismatches.

## Flutter

- Run `flutter doctor -v` first; fix what it flags before reading app errors.
- `flutter clean` then `flutter pub get` after dependency or SDK changes.
- iOS-side errors still go through CocoaPods; Android-side through Gradle. Read those logs the same way.

## Clearing caches, in order

Only when evidence points to a stale cache:

1. Metro / bundler: `--reset-cache`, or delete the watchman state with `watchman watch-del-all`.
2. Pods: `cd ios && pod deintegrate && pod install`.
3. Gradle: `cd android && ./gradlew clean`; as a last resort remove `~/.gradle/caches` (shared by every project on the machine: ask first if it was my idea).
4. Xcode: delete `~/Library/Developer/Xcode/DerivedData` for the project.
5. Flutter: `flutter clean`.

After each step, rebuild and check whether the error changed. Stop at the step that fixes it and say which one.

## Device logs

- Android: `adb logcat`, filtered with `adb logcat --pid=$(adb shell pidof -s <package>)` or by tag. Native crashes show `FATAL EXCEPTION` or a tombstone.
- iOS simulator: `xcrun simctl spawn booted log stream --predicate 'process == "<App>"'`.
- iOS device: the Xcode console or Console.app with the device selected.
- Crash on launch with no JS error almost always means a native error; the device log has it.

## Debugging tools

- Flipper is deprecated for React Native; use React Native DevTools for JS, network and component inspection.
- Flutter DevTools for widget tree, performance and memory.
- Android Studio for the layout inspector, profiler and native debugger.
- Xcode for breakpoints, the view debugger and Instruments (time, allocations, leaks).

## Release-only bugs

- Build the release variant locally and reproduce there before guessing.
- Android minification (R8 / ProGuard) strips or renames classes used by reflection or JSON parsing; add keep rules for those classes and confirm with the mapping file.
- Hermes or AOT compilation can expose code that relied on debug-only behaviour; check the engine actually in use.
- Release builds point at production config and may lack debug-only permissions or network security exceptions (cleartext HTTP).
- Turn off dev-only flags and assertions deliberately in a test build to narrow which difference matters.
