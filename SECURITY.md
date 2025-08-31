# Security Implementation

This nightdev installation includes advanced password protection to prevent unauthorized access.

## Features

- **Multi-layer Authentication**: The site uses multiple security layers to ensure only authorized users can access the content.
- **Anti-tampering Protection**: Built-in measures to detect and prevent bypass attempts.
- **Developer Tools Protection**: Automatic detection and blocking of common debugging tools.
- **Session Management**: Secure session handling with both session and local storage.

## Security Measures

1. **Obfuscated Code**: The authentication logic is heavily obfuscated to prevent easy analysis.
2. **Multiple Encoding**: Passwords are encoded using multiple layers of encryption.
3. **DOM Protection**: Monitors for unauthorized changes to the authentication interface.
4. **Console Protection**: Detects and prevents console-based bypass attempts.
5. **DevTools Detection**: Automatically detects when developer tools are opened.

## Files

- `auth.js` - Primary authentication system
- `security.js` - Secondary security layer
- `config.js` - Configuration file (contains decoy data)

## Notes

- The password is not stored in plain text anywhere in the codebase
- Multiple fake passwords are included as decoys
- The system uses advanced obfuscation techniques
- Bypass attempts will result in page reload or redirect

## Maintenance

To update the password, you'll need to modify the encoded values in the authentication files. The password is stored using multiple encoding layers for security.

**Warning**: Do not attempt to disable or modify the security system as it may break the site functionality.