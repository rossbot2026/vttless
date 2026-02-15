# Password Reset Issue Analysis

## Current Flow Diagram

```
User Request                           Backend                          Database
    |                                    |                                 |
    |--- POST /auth/forgot-password ---> |                                 |
    |     {email: "test@email.com"}      |                                 |
    |                                    |--- Find user by email -------->|
    |                                    |<---- User found ---------------|
    |                                    |--- Generate reset token ------|
    |                                    |--- Save token to user ---------|---> FAILS: Fields don't exist!
    |                                    |--- Send email via Resend ---->|
    |<-- 200 OK (success) ---------------|                                 |
    |                                    |                                 |
    |--- Click reset link --------------> |                                 |
    |     /password-reset?token=xxx     |                                 |
    |                                    |                                 |
    |--- POST /auth/reset-password -----> |                                 |
    |     {token, password}              |                                 |
    |                                    |--- Hash token ----------------->|
    |                                    |--- Find user by token -------->|
    |                                    |<---- User NOT found -----------|---> FAILS: Token wasn't saved!
    |<-- 400 Invalid token --------------|                                 |
```

## What Works vs What Doesn't

### ✅ What Works
1. **Forgot password endpoint exists**: `POST /auth/forgot-password` is properly defined in routes
2. **Reset password endpoint exists**: `POST /auth/reset-password` is properly defined
3. **Frontend page exists**: `client/src/components/PasswordReset.jsx` exists
4. **Resend API configured**: `RESEND_API_KEY` is set in `backend/.env`
5. **Email sending logic**: The code properly handles Resend API calls

### ❌ What Doesn't Work

#### Critical Issue #1: User Model Missing Reset Token Fields
**File**: `backend/models/user.js`

The Auth controller tries to save `passwordResetToken` and `passwordResetTokenExpiry` to the user:
```javascript
// Auth.js line ~200
user.passwordResetToken = resetTokenHash;
user.passwordResetTokenExpiry = resetTokenExpiry;
await user.save();
```

But the User schema doesn't define these fields - **Mongoose silently ignores them**.

**Fix needed**: Add these fields to the User schema:
```javascript
passwordResetToken: String,
passwordResetTokenExpiry: Date,
```

#### Critical Issue #2: Frontend Doesn't Read Token from URL
**File**: `client/src/components/PasswordReset.jsx`

The PasswordReset component doesn't use `useSearchParams` or `useLocation` to detect if there's a token in the URL. Users clicking the email link see the "Forgot Password" form instead of the "Reset Password" form.

**Fix needed**: Add logic to detect token from URL and auto-switch to reset mode.

## Specific Failure Points

| Step | Status | Issue |
|------|--------|-------|
| 1. User requests password reset | ❌ FAIL | Token fields don't exist in User model |
| 2. Backend generates token | ✅ OK | `crypto.randomBytes(32).toString('hex')` works |
| 3. Token saved to database | ❌ FAIL | Fields `passwordResetToken`, `passwordResetTokenExpiry` missing in schema |
| 4. Email sent with reset link | ⚠️ SKIP | Email logic never reached due to save failure |
| 5. User clicks link | ❌ FAIL | Frontend doesn't read token from URL |
| 6. User submits new password | ❌ FAIL | Token lookup fails (token was never saved) |

## Environment Setup Verification

- ✅ **Resend API Key**: Configured in `backend/.env` (`re_P6ejTkvX_5B959w7rHt5i1cFhgkfKKvxY`)
- ✅ **Email From**: Configured (`noreply@vttless.com`)
- ✅ **Frontend page**: Exists at `/password-reset`
- ⚠️ **Token URL handling**: Missing in frontend component

## Root Cause Summary

1. **Primary Root Cause**: The User model schema (`backend/models/user.js`) is missing the `passwordResetToken` and `passwordResetTokenExpiry` fields. When `forgotPassword` tries to save these values, Mongoose silently ignores them, so the reset token is never stored in the database.

2. **Secondary Root Cause**: The frontend `PasswordReset.jsx` component doesn't read the `token` query parameter from the URL, so even if the backend worked, users couldn't complete the flow.

## Files/Lines Needing Changes

### 1. `backend/models/user.js`
Add after `passwordChangedAt` field:
```javascript
passwordResetToken: String,
passwordResetTokenExpiry: Date,
```

### 2. `client/src/components/PasswordReset.jsx`
Add at component top:
```javascript
const { search } = useLocation();
const searchParams = new URLSearchParams(search);
const urlToken = searchParams.get('token');

useEffect(() => {
    if (urlToken) {
        setResetToken(urlToken);
        setIsResetMode(true);
    }
}, [urlToken]);
```

## Implementation Plan

### Phase 1: Fix Backend (Priority 1)
1. Add `passwordResetToken` and `passwordResetTokenExpiry` to User schema
2. Test forgot-password endpoint with test user
3. Verify token is saved in database

### Phase 2: Fix Frontend (Priority 2)
1. Add URL parameter detection for token
2. Test the full flow end-to-end

### Phase 3: Verify End-to-End (Priority 3)
1. Create test user or use existing: `mrosstech@gmail.com`
2. Call `POST /auth/forgot-password` with test email
3. Verify email is sent (check Resend dashboard)
4. Click link and verify frontend loads reset form
5. Submit new password and verify it works

## Recommended Test Steps

```bash
# Test forgot password endpoint
curl -X POST http://localhost:5000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "mrosstech@gmail.com"}'
```

Expected response (even if user doesn't exist, should return success to prevent email enumeration):
```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset link has been sent"
}
```

Then check MongoDB to verify token was saved:
```javascript
db.users.findOne({email: "mrosstech@gmail.com"}, {passwordResetToken: 1, passwordResetTokenExpiry: 1})
```
