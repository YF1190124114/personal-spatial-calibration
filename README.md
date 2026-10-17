# Personal Spatial Calibration — V0.4

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
