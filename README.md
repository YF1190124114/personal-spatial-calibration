# Personal Spatial Calibration — V0.2

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

## Current scope and architecture

V0.1–V0.2 only: live camera preview, permission/error states, camera selection, and a permanently disabled Start Calibration button. No pose estimation, microphone recording, calibration, IMU, GPS, LiDAR, storage or upload. Video stays in the browser and is not recorded.

`src/camera/useCamera.ts` owns the stream lifecycle; `src/App.tsx` owns the interface; `src/style.css` owns responsive presentation. Future independent modules can be added under `src/pose`, `src/calibration`, `src/audio` and `src/data` when they have real implementations.

Next stage: pose estimation, including confidence and upper-body visibility checks. Start Calibration must remain disabled until valid pose tracking is implemented.

## Verification — 13 October 2026

- `npm run build`: TypeScript and production build passed.
- Development server started successfully at http://127.0.0.1:5173/.
- Desktop Chrome: actual FaceTime camera feed visibly rendered and remained live.
- Rejected camera permission: denial message and retry button shown; resetting the test denial and retrying recovered the live preview.
- Switch camera: stream restarted successfully on the single-camera laptop; physical front/back selection cannot be verified without a multi-camera device.
- Chrome responsive viewport at 400 × 729: title, live preview, status, controls and disabled calibration button visible and usable.
- Browser console: no errors; only the standard React development-tools message.
- Real phone testing remains pending. No pose or audio functionality was added.
