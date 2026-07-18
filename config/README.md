# Firebase server configuration

GrantPilot verifies Firebase Authentication ID tokens with Google's public
signing certificates.

The server needs only:

```env
FIREBASE_PROJECT_ID=recipehub-142f4
```

Do not add a Firebase service-account private key to this project. Normal
email/password authentication and Firebase Google authentication both work
without one.
