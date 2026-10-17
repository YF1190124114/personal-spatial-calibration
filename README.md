# Personal Spatial Calibration — V0.6

A browser-only research prototype built with React, Vite, TypeScript and standard browser APIs.

## Install and run

Requires Node.js 20.19+ or 22+ and npm.

```sh
cd outputs/spatial-calibration
npm install
npm run dev
```

Open http://localhost:5173. Production check: `npm run build`. Preview a build: `npm run preview`.

## Camera permissions

The page requests video permission on mount with `navigator.mediaDevices.getUserMedia()`. Audio is explicitly disabled. Approve the browser prompt to see yourself. If denied, change camera permission in the browser's site settings and press **Try again**. Camera-in-use, missing-device and insecure-context failures have useful messages. **Switch camera** requests front/back facing mode; browsers without both cameras may retain the same camera. Once permission is granted, devices are listed where available. The front-facing automatic preview is mirrored for positioning. All stream tracks stop on camera change or component unmount; late permission responses are also cleaned up.

Camera APIs require a secure context: HTTPS or localhost. Ordinary HTTP over a LAN IP does not qualify. Browser and operating-system permissions must both allow camera access. Embedded browsers may restrict camera access; use desktop Chrome directly if needed.

## Mobile browsers

The layout supports narrow screens, uses `playsInline` and muted video, and requests front-facing video by default. A phone must visit an HTTPS deployment or a securely configured development URL; the computer's localhost URL does not refer to the computer when opened on a phone. Camera switching depends on device/browser support. Test on real mobile hardware before relying on it for research sessions.

## Preserved V0.3 pose tracking

Real-time MediaPipe Pose Landmarker reads the existing camera video element; there is exactly one `getUserMedia` pipeline, unchanged in `src/camera/useCamera.ts`. `src/pose/usePose.ts` owns model loading, inference, drawing, and cleanup. `src/pose/poseMath.ts` defines confidence and preview geometry. The overlay draws visible pose landmarks and connections, highlighting nose (0), left/right ears (7/8), and left/right shoulders (11/12) in gold with anatomical labels. Left/right describe the subject, including in a mirrored preview.

No orientation estimates, angle values, calibration, audio recording, storage or uploads. V0.4 enables Start Calibration for the manual guided interaction only. All video and pose inference stay in this browser.

### Model and runtime assets

The only additional dependency is pinned `@mediapipe/tasks-vision@1.1.0`. The official Google float16 **Pose Landmarker Lite**, version 1, is stored at `public/models/pose_landmarker_lite.task` (~5.8 MB):

https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task

`postinstall`, `predev` and `prebuild` copy the matching installed WebAssembly runtime into ignored `public/mediapipe/wasm`. The production build includes both the model and runtime. There are no runtime CDN requests. Do not delete the committed model asset. See the [official Web guide](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js).

### Tracking and confidence

- Initializing: loading model or waiting for the camera.
- Person detected: all five highlighted landmarks have a score of at least 0.5.
- Tracking uncertain: a pose exists but at least one highlighted landmark is below that threshold.
- Person not detected: MediaPipe returns no pose; the overlay clears and confidence shows a dash.
- Model error: loading/inference failed; retry is available and camera capture continues.

The indicator averages the five highlighted landmarks. Each score uses the smaller available visibility/presence value; unavailable scores count as zero. It is a simple heuristic, not a calibrated probability or an orientation confidence score. Other landmarks and connections are drawn only above 0.35. Poorly visible points are hidden rather than presented as reliable. One person is tracked; MediaPipe may select another person if several are in view.

The canvas matches centered `object-fit: contain` video geometry, including letterboxing and device pixel ratio. Its coordinates mirror with the existing front-camera preview; text stays readable. Camera switches stop inference and reload the model; unmount/error closes MediaPipe. Inference pauses in hidden tabs and runs at most 15 times per second with duplicate video frames skipped. The lightweight CPU model uses synchronous inference on the main thread; slower devices may show lag. A worker is a possible later performance improvement, not part of V0.3.

## V0.3 verification — 13 October 2026

Automated checks:

- `npm run test`: five tests passed for empty results, missing/weak confidence scores, uncertain tracking, and mirrored/letterboxed coordinate mapping.
- `npm run build`: TypeScript and production build passed, including local model/runtime assets.

Actual browser checks:

- Local development server started at http://localhost:5173/.
- Desktop Chrome: real camera feed still works; MediaPipe loaded successfully and drew highlighted landmarks on a frontal person.
- Live observations showed landmark positions updating and Person detected/Tracking uncertain states changing with visibility.
- Chrome responsive viewport at 384 × 729: the overlay remained aligned after resizing, and controls/status remained usable. The page can scroll on shorter screens.
- No breaking JavaScript exception observed. MediaPipe emits internal warnings (feedback tensors, projection and GL checking); its informational XNNPACK CPU initialization message is printed through stderr and appears red in Chrome. These did not stop tracking.

Human verification still required:

1. Face forward with both shoulders visible; move head/arms and check each landmark follows.
2. Turn to each side and then face away; inspect landmark disappearance, possible incorrect inferred locations and uncertainty. Do not interpret confidence as orientation validity.
3. Leave the frame completely; verify Person not detected, empty overlay and dash confidence; re-enter and check recovery.
4. Test actual phone front/back cameras and switch repeatedly; check mirror alignment, permissions, responsiveness and performance.

The automated empty-result test is not a physical empty-room test. Side/back accuracy and real mobile hardware were not validated. Hair, occlusion, lighting, cropping and back views can cause incorrect landmarks, even with high model confidence. V0.3 stops at pose landmark tracking.

## V0.4 guided interaction prototype

Start Calibration opens preparation, then eight manual movement prompts: 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°. These are predefined instructions, never measured body angles. The animated figure demonstrates a rightward turn relative to the starting position, independently of the mirrored live preview. Gold on the figure marks its front. Each step requires explicit manual confirmation, a three-second hold (3–2–1), and explicit advancement after completion feedback. The final message is “Movement sequence complete.”

Architecture: `src/calibration/machine.ts` is a pure reducer with idle → preparation → rotate → countdown → feedback → complete phases. Paused is an orthogonal flag preserving phase and countdown value. `useCalibration.ts` owns a cancellable timer and automatically pauses when the tab is hidden. Resuming a countdown grants a fresh full second for the displayed number. Previous clears completion from the revisited step onward; from completion it revisits 315°. Restart resets to preparation, and Exit resets to camera setup. `CalibrationFlow`, `ProgressRing`, and `RotationFigure` are reusable presentation components. Future orientation/audio contracts are types only, with no connected implementation. Camera and pose hooks remain mounted in App throughout, including on exit/restart. Their implementations are unchanged.

No additional dependencies. No audio recording, datasets, localization, direction sensing or acoustic calibration. The flow intentionally permits manual exploration even if a camera/model is unavailable; it never treats manual confirmation or pose confidence as sensor validation. The sequence is held in memory and resets on a page reload. Reduced-motion users see a static target figure. Pause freezes the sequence, not the camera or pose tracking. Mobile screens scroll naturally through the live preview and instructions.

### Manual acceptance test

1. Run `npm run dev` and open http://localhost:5173/. Allow camera access and verify live landmarks.
2. Select Start Calibration; verify preparation instructions and tracking status. Select I'm Ready.
3. At 0°, select I'm at 0°. Observe 3, 2, 1, then step completion feedback. Choose Next direction. Repeat all eight steps and Finish sequence; verify “Movement sequence complete.”
4. Pause during the hold; wait several seconds and verify the displayed number stays unchanged. Resume and verify the countdown continues.
5. At 45° or later, choose Previous step; verify the earlier step is current and its progress is cleared for redoing.
6. Restart during a countdown and verify preparation with 0/8 progress. Exit during a countdown and verify camera setup returns with no delayed completion.
7. Switch tabs during a countdown and return; verify the sequence is paused until Resume.
8. Confirm camera feed and pose overlay continue during preparation, hold, pause, navigation, restart, completion and exit.
9. Check desktop and a narrow viewport (384 × 729), then a real phone; verify large controls, readable prompts, animation, and progress.

Automated verification: `npm run test` passes ten tests, including complete eight-step reducer flow, 3–2–1 transitions, pause/resume, previous invalidation, restart, exit, invalid/duplicate events, and the existing five pose tests. `npm run build` passes. Physical turning and real-phone behavior still require user acceptance. No commit or push is made until acceptance.

V0.4 browser verification limits: Chrome visibly showed preparation and the 0° step-completion state with 1/8 circular progress. A subsequent screenshot showed the real camera image and pose landmarks still active in the guided flow. Desktop presentation and the initial 384 × 729 preparation state were inspected. Browser automation repeatedly timed out or refused input after reporting changed UI, so a complete eight-step browser click-through, live countdown pause/resume timing, navigation and final mobile visual acceptance remain pending. Those state transitions passed the automated reducer tests; this is not a claim of full browser or physical acceptance.

## V0.5 — ESS playback only

This revision adds one locally served sweep to each manual direction. It does not capture audio, measure a directional response, estimate orientation, analyze acoustics or create a dataset. All eight directions use `public/audio/ess-200-8000-3s.wav`; there are no direction-specific signals.

### Signal and reproduction

- Logarithmic/exponential sine sweep, generated using `scipy.signal.chirp(method="logarithmic", phi=-90)`.
- 200 Hz at t=0 to 8000 Hz at t=3 s; 3.000 s, 48,000 Hz, 144,000 samples, mono PCM16 WAV. The final stored sample occurs at t=3−1/48000 s, as usual for sampled audio.
- 20 ms (960 samples) sine-squared fade-in and fade-out; both endpoints are zero.
- File peak amplitude 0.20 (approximately −14 dBFS). Fixed Web Audio gain 0.5 for every direction, giving an approximate digital peak of 0.10 (−20 dBFS); no automatic volume changes. Actual speaker loudness depends on the user's device and volume.

Reproduce with Python (tested using Python 3.13, NumPy 2.5.4, SciPy 1.18.1):

```sh
python3 -m venv .venv
.venv/bin/pip install -r scripts/requirements-audio.txt
.venv/bin/python scripts/generate_ess.py
.venv/bin/python scripts/test_ess.py
```

The WAV is checked in as a required reproducible asset; users need no Python installation to run the web app.

### Playback architecture

`src/audio/EssPlayer.ts` lazily creates one AudioContext, fetches/decodes the WAV once, and caches its AudioBuffer across directions, pauses, restarts and exits. Each play creates a fresh one-shot source with gain 0.5 and stops any existing source first. A generation counter and source identity guard discard stale end events. Explicit stop clears the end handler, so interrupted playback never counts as completed. Natural `onended` is the only playback completion signal; a progress timer never completes a step. AudioContext suspension/interruption stops audio and pauses the sequence. Final hook unmount stops playback and closes the context.

`useCalibration.ts` remains mounted with camera and pose hooks. Ready, direction confirmation and Resume call AudioContext.resume directly in the click handler before awaiting asset preparation. An operation counter invalidates pending preparations after navigation, pause, exit or restart. Countdown timers and playback progress timers are canceled on phase changes. No extra camera capture pipeline is created.

Reducer sequence: preparation → rotate/manual confirmation → countdown (3,2,1) → playing → feedback → next direction, then complete after direction eight. `AUDIO_ENDED` advances completion only in playing; failure returns to rotate without credit. A pause during sound stops it and returns the current direction to manual confirmation. Resume requires another confirmation, a full countdown and full sweep. Previous is disabled during playback; pause, restart and exit remain enabled as immediate stop controls. From later phases, Previous invalidates completion from the revisited direction onward. Next remains explicit so step feedback is readable.

Before the first sound, preparation displays: “Please set your device volume to a comfortable level.” Playback shows “Playing calibration sound”, “Please remain still”, audio-clock progress and remaining seconds. The camera and pose implementations are unchanged.

### V0.5 verification — 17 October 2026

- `npm run test`: 21 tests, using the real reducer and a simulated Web Audio implementation, plus existing pose tests. Coverage includes shared eight-direction buffer/fetch/decode, completion ordering, duplicate countdown events, stop/no-overlap/stale completion, suspension, load/decode/start errors and retry, full replay after pause, Previous, Restart and Exit. The actual WAV format, length, headroom and endpoints are checked in this suite. These are automated logic tests, not an acoustic or real-speaker measurement.
- `python scripts/test_ess.py`: validates the exact generated samples, 20 ms envelopes, and logarithmic instantaneous-frequency law, as well as WAV parameters.
- `npm run build`: TypeScript and Vite production build pass, including the WAV.
- Desktop Chrome: preparation warning displayed; Ready enabled audio successfully; 0° countdown completed, Web Audio ended naturally, Playback completed feedback appeared and progress became 1/8. Next direction reached 45°. The camera remained ready and pose status continued updating during the flow. An initial native-fetch receiver issue was fixed and given a regression test.
- Full physical listening, real phone autoplay/interruption behavior, continuous eight-direction browser playback, and live interruption timing remain manual acceptance checks. No claim of audible speaker output, exact physical sound pressure or acoustic success is made from UI/automated tests. Existing MediaPipe diagnostic logs remain possible.

Manual acceptance: set a comfortable low device volume, start the flow, select Ready, confirm each target, watch 3–2–1, listen to the complete three-second sweep, and advance only after Playback completed. Repeat eight directions. Pause during a sweep and check silence; Resume, confirm again and verify the full sweep replays. Test Previous from feedback, Restart and Exit during a sweep; confirm no stale completion or overlapping sound. Check the live camera and landmarks, and repeat on an actual phone using HTTPS. A muted or misrouted device can complete Web Audio playback silently; the prototype cannot verify physical sound output.

## V0.6 — Microphone capture and local dataset export

Microphone permission is requested only by clicking **Enable microphone** (or explicitly selecting/reconnecting a device after permission). Camera capture and MediaPipe implementations remain unchanged. `Microphone.ts` enumerates audio inputs, listens for device changes, stops previous audio tracks on switching, stops stale streams from late permission requests, and handles missing/ended/muted tracks. Denial and unavailable-device states have recovery instructions. Camera/video tracks are never stopped by microphone management.

The microphone panel shows the selected device, connection and last-request permission status, effective processing settings, recording stage, live RMS level and waveform. A connected microphone remains active for level monitoring, including after leaving the flow; click **Disconnect microphone** to stop its audio tracks. Monitoring does not retain PCM. Device selection is locked during countdown/capture; Disconnect, Pause, Restart and Exit remain emergency stop controls.

### Raw PCM architecture and timing

- `public/worklets/pcm-capture.js` runs on the audio rendering thread. It captures float PCM to bounded in-memory chunks, downmixed by Web Audio to one channel. Its output stays silent, preventing microphone-to-speaker feedback. No MediaRecorder or compressed recording is used.
- `PcmRecorder.ts` owns the worklet graph, command IDs, monitoring, pre-roll/complete promises, cancellation and timeout. Devices require AudioWorklet support on localhost/HTTPS; unsupported browsers report a setup error rather than fall back to compressed audio.
- ESS and PCM share the **same AudioContext**. The WAV sample rate is the actual AudioContext rendering/capture rate, not an assumed 48 kHz. The microphone track's reported `getSettings().sampleRate` and channel count are separately retained because the browser can resample/downmix the input.
- After 3–2–1: recording prepare → pre-roll (at least 250 ms of captured samples) → ESS playback while recording → post-roll (at least 250 ms after the playback end callback) → validate/encode WAV → direction complete. The recorder acknowledges sample-counted pre-roll before playback starts. Main-thread callback latency can extend pre/post-roll; it cannot shorten the required windows. Total duration is therefore usually slightly over 3.5 s.
- Metadata includes the actual sweep start offset relative to the capture's AudioContext start frame. Continuity, nonempty finite samples and complete pre/sweep/post coverage are checked before accepting a recording. A disconnected or muted track, processor error, suspended audio context, hidden tab or timeout discards the incomplete capture and stops playback. Resume requires manual reconfirmation and a fresh full capture.
- Capture timestamps are UTC wall-clock estimates mapped from the AudioContext start frame; they are not calibrated hardware timestamps. Input/output device latency and acoustic propagation delay are not measured or corrected.
- Capture is capped at 15 s in the worklet, with an 18 s controller watchdog. Sources, worklets and microphone tracks are cleaned up on disconnect/unmount. The ESS AudioBuffer is still decoded once and reused.

Requested constraints are `echoCancellation: false`, `noiseSuppression: false`, `autoGainControl: false`, with mono preferred. Each file's metadata stores requested values and the complete effective `track.getSettings()` snapshot; missing values are not assumed false. Warnings flag processing that remains enabled/unreported, very low/silent input and possible clipping. These are basic software diagnostics, not an acoustic-response analysis. A recording with a quality warning is retained for inspection; it does not prove a usable measurement.

### Data and ZIP schema

Recordings remain in memory for the current tab. No server receives audio or metadata. Reload, Restart and Exit clear the dataset; Previous clears the revisited direction and all later directions. Switching microphones preserves completed files and records each file's own microphone identity; the UI warns if a session includes multiple microphones. A paused incomplete direction is discarded, while earlier completed directions remain.

Export becomes available only after all eight unique direction WAVs pass format/metadata consistency validation. The archive uses standard ZIP STORE with CRC32 and contains exactly:

```text
metadata.json
000deg.wav
045deg.wav
090deg.wav
135deg.wav
180deg.wav
225deg.wav
270deg.wav
315deg.wav
```

Each WAV is mono, uncompressed little-endian **16-bit PCM**, encoded from worklet float PCM without normalization or automatic level changes. Each recording entry in `metadata.json` includes direction label (manual prompt), actual sample rate, channel count, frame count, duration, capture timestamp, WAV filename/encoding/size, microphone label/device/group identity, requested/effective processing settings, ESS identifier, pre-roll/sweep-start offset/sweep-duration/actual post-roll, start frame, RMS/peak and warnings. Session metadata contains schema/app version, session UUID/start/export timestamps, user agent, ESS parameters and fixed gain, capture/storage mode and limitations. Device identities are private metadata in the local download; there is no upload.

`dataset.ts` implements PCM16 WAV encoding, validation, quality flags and dependency-free ZIP packaging. `captureDirection.ts` coordinates playback and recording with abort-safe cleanup; the reducer grants completion only on `RECORDING_COMPLETE`, never on playback end alone. The UI separately displays **Playback completed** during post-roll and **Audio recording completed** after successful WAV capture.

### V0.6 verification

- Automated tests: microphone grant/denial, requested constraints, old-track shutdown on switching, removal, late permission cancellation; real worklet source exercised in a simulated render environment; pre-roll/post-roll sample counts, discontinuity/empty-input handling; recorder overlap prevention, sample-rate propagation, watchdog and stale setup cancellation; eight-direction capture orchestration, interrupted/short/failed capture rejection; WAV encoding and metadata consistency; ZIP names/entries/CRC; existing ESS and pose tests.
- Independent Python `zipfile`/`wave` check of a **simulated** eight-recording export: nine entries, valid CRCs, mono PCM16, sample rates/frame counts match metadata. This is a file-format test, not a real acoustic dataset.
- Real desktop Chrome: microphone permission granted by a user action; live PCM levels changed; actual settings reported all three processing options off. Switching between available phone and MacBook built-in microphones succeeded. A real 0° capture reached **Audio recording completed** and **Session recordings 1/8**. Camera remained ready and pose status/landmarks continued updating. Export was disabled with fewer than eight recordings.
- Full real eight-direction recording/export, physical unplug/revoked-permission recovery, live pause timing and real mobile-browser acceptance still require human verification. Automated tests use simulated devices/audio clocks and cannot establish speaker/microphone acoustic quality.

Manual acceptance: enable microphone; inspect selected device, levels and effective processing; set comfortable playback volume; start the flow and confirm each direction. Verify pre-roll → playback → post-roll → recording complete. Pause during pre-roll, playback and post-roll and verify no new recording is retained; Resume and reconfirm to replay. Test switching devices, Disconnect, Previous, Restart and Exit. Finish eight directions and download the ZIP, then inspect WAVs and metadata. Repeat on an actual phone via HTTPS. Built-in microphone recordings are **software pipeline tests**, not measurements of the user's pinna response, HRTF, orientation or localization. No acoustic calibration success is claimed.
