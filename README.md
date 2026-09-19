# React + TypeScript + Vite

## Windows location flow

The Electron client gets coordinates from the Windows Location Services API through
`Windows.Devices.Geolocation`. The renderer calls the safe preload API
`window.locationApi.getCurrentLocation()`. The Electron main process invokes
`electron/windows/get-current-location.ps1`, validates the returned coordinates,
and sends them through the existing session flow:

1. The user clicks **Use my current location**.
2. The helper requests Windows location access and returns `{ latitude, longitude }`.
3. The client creates a session with `POST /v4/session`.
4. The client posts coordinates to `POST /v4/session/location` using the session token.
5. Existing current and forecast endpoints load weather for that session.

### Running locally

Run the client with `npm run dev` from Windows. The helper is invoked by Electron,
not by the Vite renderer. Windows Location Services must be enabled in
**Settings > Privacy & security > Location**. Allow location access for desktop
apps when Windows prompts or when the setting is shown. Wi-Fi or another Windows
location provider must be available; a desktop without a provider can report an
unavailable location.

### Packaging

`electron-builder` copies `electron/windows/get-current-location.ps1` into the
packaged app's `resources/windows` directory through `extraResources`. Build with
`npm run build` on Windows. PowerShell is invoked with `-NoProfile`,
`-NonInteractive`, and `-ExecutionPolicy Bypass` for this bundled script only.

### Failure states

The launch screen distinguishes permission denied, disabled/unavailable Windows
location services, timeout, malformed coordinates, and backend session/location
failures. No IP geolocation, browser geolocation provider, or hardcoded fallback
coordinates are used.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default {
  // other rules...
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
  },
}
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list
