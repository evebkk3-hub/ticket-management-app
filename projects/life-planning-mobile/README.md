# Life Planning Mobile

React Native (Expo) client for iPad 11-inch with a Java calculation API.

## Run Java API

From the repository root:

```powershell
.\run-ticket-web.cmd
```

## Run on iPad

Set the Java server URL to the computer's LAN IP (the iPad cannot use the computer's `localhost`):

```powershell
$env:EXPO_PUBLIC_API_URL='http://192.168.1.10:8080'
npm install
npm start
```

Open the QR code with Expo Go on the iPad. Both devices must be on the same network.

## iOS build

The Expo project enables `supportsTablet` and landscape full-screen mode. A signed standalone iOS build requires an Apple Developer account and EAS Build or Xcode on macOS.
