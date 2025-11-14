LocusFocus (Chrome MV3) v1.0.1

Features
- One‑click block for common social media (Declarative Net Request)
- Ultra Lock timer (irrevocable until time ends)
- Mutual Lock with a buddy via your own Firebase Firestore
- Friendly blocked landing page instead of a network error
- Shadcn-inspired UI with serif headings and adaptive light/dark themes

Install
1) Open chrome://extensions → enable Developer mode.
2) Click "Load unpacked" → select this folder.

Mutual Lock
- Create a Firebase project → enable Firestore (Native mode).
- In the extension Options page, paste the SDK config (apiKey, authDomain, projectId, appId).
- Set Your ID, Partner ID, and a shared Room ID. Toggle Enable.
- Use "Test Connection".

Notes
- Add/remove sites in social_domains.js.
- Ultra Lock cannot be canceled early by design.
