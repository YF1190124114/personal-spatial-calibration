# Personal Spatial Calibration — V0.3

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

## Current V0.3 scope and architecture

Real-time MediaPipe Pose Landmarker reads the existing camera video element; there is exactly one `getUserMedia` pipeline, unchanged in `src/camera/useCamera.ts`. `src/pose/usePose.ts` owns model loading, inference, drawing, and cleanup. `src/pose/poseMath.ts` defines confidence and preview geometry. The overlay draws visible pose landmarks and connections, highlighting nose (0), left/right ears (7/8), and left/right shoulders (11/12) in gold with anatomical labels. Left/right describe the subject, including in a mirrored preview.

No orientation estimates, angle values, calibration, audio recording, storage or uploads. Start Calibration remains disabled. All video and pose inference stay in this browser.

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
