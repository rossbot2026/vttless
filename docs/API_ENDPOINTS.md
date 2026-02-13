# VTTless API Endpoints Documentation

This document lists all API endpoints in the VTTless application, their methods, parameters, authentication requirements, and expected responses.

## Base URL
- Development: `http://localhost:3001`
- Production: Based on deployment environment

---

## Health Check

### GET /health
- **Description**: Health check endpoint
- **Auth Required**: No
- **Parameters**: None
- **Response**:
  ```json
  {
    "status": "ok",
    "service": "backend"
  }
  ```

---

## Authentication Endpoints

### POST /auth/login
- **Description**: Authenticate user and return JWT tokens
- **Auth Required**: No
- **Parameters**:
  ```json
  {
    "email": "string (required)",
    "password": "string (required)"
  }
  ```
- **Response 200**:
  ```json
  {
    "success": true,
    "token": "jwt-access-token",
    "refreshToken": "jwt-refresh-token",
    "user": {
      "id": "user-id",
      "username": "username",
      "email": "email@example.com"
    }
  }
  ```
- **Response 400**: Missing credentials
- **Response 401**: Invalid credentials

### GET /auth/validate
- **Description**: Validate current JWT token
- **Auth Required**: Yes (JWT)
- **Parameters**: None
- **Response 200**:
  ```json
  {
    "success": true,
    "user": { /* user object */ }
  }
  ```
- **Response 401**: Invalid or expired token

### GET /auth/logout
- **Description**: Logout user and invalidate tokens
- **Auth Required**: Yes (JWT)
- **Parameters**: None
- **Response 200**:
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```

### POST /auth/refresh
- **Description**: Refresh access token using refresh token
- **Auth Required**: Yes (Refresh Token)
- **Parameters**:
  ```json
  {
    "refreshToken": "string (required)"
  }
  ```
- **Response 200**:
  ```json
  {
    "success": true,
    "token": "new-jwt-access-token"
  }
  ```

### POST /auth/change-password
- **Description**: Change user password with security validation
- **Auth Required**: Yes (JWT)
- **Parameters**:
  ```json
  {
    "currentPassword": "string (required)",
    "newPassword": "string (required, min 8 chars)"
  }
  ```
- **Response 200**: Password changed successfully
- **Response 400**: Missing credentials or weak password
- **Response 401**: Invalid current password

### POST /auth/forgot-password
- **Description**: Request password reset link via email
- **Auth Required**: No
- **Parameters**:
  ```json
  {
    "email": "string (required)"
  }
  ```
- **Response 200**: Email sent (even if email doesn't exist for security)

### POST /auth/reset-password
- **Description**: Reset password using reset token
- **Auth Required**: No
- **Parameters**:
  ```json
  {
    "token": "string (required)",
    "password": "string (required, min 8 chars)"
  }
  ```
- **Response 200**: Password reset successfully
- **Response 400**: Invalid or expired token

### GET /auth/me
- **Description**: Get current authenticated user information
- **Auth Required**: Yes (JWT)
- **Parameters**: None
- **Response 200**:
  ```json
  {
    "success": true,
    "user": { /* full user object without password */ }
  }
  ```

---

## User Endpoints

### POST /users/signup
- **Description**: Register a new user
- **Auth Required**: No
- **Parameters**:
  ```json
  {
    "username": "string (required)",
    "email": "string (required)",
    "password": "string (required)"
  }
  ```
- **Response 201**: User created successfully
- **Response 409**: Username or email already exists

---

## Campaign Endpoints

### GET /campaigns/list
- **Description**: List all campaigns for authenticated user
- **Auth Required**: Yes (JWT)
- **Parameters**: None
- **Response**: Array of campaigns

### POST /campaigns/add
- **Description**: Create a new campaign
- **Auth Required**: Yes (JWT)
- **Parameters**:
  ```json
  {
    "name": "string (required)",
    "description": "string (optional)"
  }
  ```

### POST /campaigns/delete
- **Description**: Delete a campaign
- **Auth Required**: Yes (JWT)
- **Parameters**:
  ```json
  {
    "campaignId": "string (required)"
  }
  ```

### POST /campaigns/update
- **Description**: Update campaign details
- **Auth Required**: Yes (JWT)
- **Parameters**:
  ```json
  {
    "campaignId": "string (required)",
    "name": "string (optional)",
    "description": "string (optional)"
  }
  ```

### POST /campaigns/join
- **Description**: Join an existing campaign
- **Auth Required**: Yes (JWT)
- **Parameters**:
  ```json
  {
    "inviteCode": "string (required)"
  }
  ```

### GET /campaigns/:id
- **Description**: Get campaign details
- **Auth Required**: Yes (JWT)
- **URL Parameters**: `id` - Campaign ID
- **Response**: Campaign object

### POST /campaigns/:campaignId/maps
- **Description**: Add a map to a campaign
- **Auth Required**: Yes (JWT)
- **URL Parameters**: `campaignId` - Campaign ID
- **Parameters**: Map data

---

## Friend Endpoints

### POST /friends/add
- **Description**: Send a friend request
- **Auth Required**: Yes (JWT)
- **Parameters**:
  ```json
  {
    "friendId": "string (required)"
  }
  ```

### GET /friends/list
- **Description**: List all confirmed friends
- **Auth Required**: Yes (JWT)
- **Parameters**: None
- **Response**: Array of friends

### GET /friends/pending
- **Description**: List pending friend requests
- **Auth Required**: Yes (JWT)
- **Parameters**: None
- **Response**: Array of pending requests

### POST /friends/confirm
- **Description**: Confirm a friend request
- **Auth Required**: Yes (JWT)
- **Parameters**:
  ```json
  {
    "friendId": "string (required)"
  }
  ```

### POST /friends/reject
- **Description**: Reject a friend request
- **Auth Required**: Yes (JWT)
- **Parameters**:
  ```json
  {
    "friendId": "string (required)"
  }
  ```

### POST /friends/remove
- **Description**: Remove a friend
- **Auth Required**: Yes (JWT)
- **Parameters**:
  ```json
  {
    "friendId": "string (required)"
  }
  ```

---

## Character Endpoints

### GET /campaigns/:campaignId/characters
- **Description**: Get all characters in a campaign
- **Auth Required**: Yes (JWT)
- **URL Parameters**: `campaignId` - Campaign ID

### GET /campaigns/:campaignId/characters/user
- **Description**: Get current user's characters in a campaign
- **Auth Required**: Yes (JWT)
- **URL Parameters**: `campaignId` - Campaign ID

### POST /campaigns/:campaignId/characters
- **Description**: Create a new character in a campaign
- **Auth Required**: Yes (JWT)
- **URL Parameters**: `campaignId` - Campaign ID

### PATCH /characters/:characterId
- **Description**: Update a character
- **Auth Required**: Yes (JWT)
- **URL Parameters**: `characterId` - Character ID

### DELETE /characters/:characterId
- **Description**: Delete a character
- **Auth Required**: Yes (JWT)
- **URL Parameters**: `characterId` - Character ID

### POST /characters/:characterId/place/:mapId
- **Description**: Place a character on a map
- **Auth Required**: Yes (JWT)
- **URL Parameters**: 
  - `characterId` - Character ID
  - `mapId` - Map ID

### DELETE /characters/:characterId/remove/:mapId
- **Description**: Remove a character from a map
- **Auth Required**: Yes (JWT)
- **URL Parameters**: 
  - `characterId` - Character ID
  - `mapId` - Map ID

### PATCH /characters/:characterId/position/:mapId
- **Description**: Update character position on a map
- **Auth Required**: Yes (JWT)
- **URL Parameters**: 
  - `characterId` - Character ID
  - `mapId` - Map ID

---

## Map Endpoints

### POST /maps
- **Description**: Create a new map
- **Auth Required**: Yes (JWT)
- **Parameters**: Map data

### GET /maps/:id
- **Description**: Get map details
- **Auth Required**: Yes (JWT)
- **URL Parameters**: `id` - Map ID

### PUT /maps/:id
- **Description**: Update map details
- **Auth Required**: Yes (JWT)
- **URL Parameters**: `id` - Map ID

### PATCH /maps/:id
- **Description**: Partial update of map
- **Auth Required**: Yes (JWT)
- **URL Parameters**: `id` - Map ID

### DELETE /maps/:id
- **Description**: Delete a map
- **Auth Required**: Yes (JWT)
- **URL Parameters**: `id` - Map ID

### GET /maps/campaign/:campaignId
- **Description**: Get all maps for a campaign
- **Auth Required**: Yes (JWT)
- **URL Parameters**: `campaignId` - Campaign ID

### PATCH /maps/:id/tokens
- **Description**: Add a token to a map
- **Auth Required**: Yes (JWT)
- **URL Parameters**: `id` - Map ID

### PATCH /maps/:id/tokens/:tokenId
- **Description**: Update a token on a map
- **Auth Required**: Yes (JWT)
- **URL Parameters**: 
  - `id` - Map ID
  - `tokenId` - Token ID

### DELETE /maps/:id/tokens/:tokenId
- **Description**: Delete a token from a map
- **Auth Required**: Yes (JWT)
- **URL Parameters**: 
  - `id` - Map ID
  - `tokenId` - Token ID

### POST /maps/analyze
- **Description**: Analyze a map image (requires multipart/form-data)
- **Auth Required**: Yes (JWT)
- **Content-Type**: multipart/form-data
- **Parameters**: `image` - Image file

---

## Image Endpoints

### GET /images/profile-photo-upload
- **Description**: Get presigned URL for profile photo upload
- **Auth Required**: Yes (JWT)
- **Response**: Upload URL

### POST /images/update-profile-photo
- **Description**: Update user's profile photo
- **Auth Required**: Yes (JWT)
- **Parameters**: Photo data

### GET /images/profile-photo-download-url
- **Description**: Get presigned URL for profile photo download
- **Auth Required**: Yes (JWT)
- **Response**: Download URL

---

## Asset Endpoints

### POST /assets/upload-url
- **Description**: Get presigned URL for asset upload
- **Auth Required**: Yes (simpleAuth middleware)
- **Parameters**: Asset metadata

### POST /assets/confirm-upload
- **Description**: Confirm asset upload completion
- **Auth Required**: Yes (simpleAuth middleware)
- **Parameters**: Upload confirmation data

### GET /assets/campaign/:campaignId
- **Description**: Get all assets for a campaign
- **Auth Required**: Yes (simpleAuth middleware)
- **URL Parameters**: `campaignId` - Campaign ID

### GET /assets/download/:id
- **Description**: Get download URL for an asset
- **Auth Required**: Yes (simpleAuth middleware)
- **URL Parameters**: `id` - Asset ID

---

## API Endpoints (Alternative Route)

### POST /api/forgot-password
- **Description**: Handle forgot password request
- **Auth Required**: No
- **Parameters**: Email

### POST /api/reset-password
- **Description**: Handle password reset request
- **Auth Required**: No
- **Parameters**: Token and new password

---

## Authentication Notes

### JWT Authentication
Most endpoints require JWT authentication. Include the token in one of these ways:
1. **Cookie**: `vttless-access` cookie
2. **Authorization Header**: `Bearer <token>`

### Token Types
- **Access Token**: Short-lived (1 hour by default), used for API access
- **Refresh Token**: Long-lived (7 days by default), used to obtain new access tokens

### Error Responses
All endpoints may return these error responses:
- **401 Unauthorized**: Missing or invalid token
- **403 Forbidden**: Valid token but insufficient permissions
- **500 Internal Server Error**: Server error

---

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE"
}
```
