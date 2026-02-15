# VTTless API Endpoints Documentation

This document provides comprehensive documentation of all API endpoints in the VTTless application.

## Table of Contents
- [Authentication Endpoints](#authentication-endpoints)
- [User Endpoints](#user-endpoints)  
- [Campaign Endpoints](#campaign-endpoints)
- [Friend System Endpoints](#friend-system-endpoints)
- [Map Endpoints](#map-endpoints)
- [Character Endpoints](#character-endpoints)
- [Image Endpoints](#image-endpoints)
- [Asset Endpoints](#asset-endpoints)
- [Health Check](#health-check)

## Authentication Endpoints

### Base Path: `/auth`

#### POST `/auth/login`
- **Method**: POST
- **Description**: Authenticate user and return JWT tokens
- **Access**: Public
- **Parameters**:
  ```json
  {
    "email": "string (required)",
    "password": "string (required)"
  }
  ```
- **Auth Requirements**: None
- **Expected Response**:
  ```json
  {
    "success": true,
    "token": "JWT access token",
    "refreshToken": "JWT refresh token",
    "user": {
      "_id": "string",
      "username": "string",
      "email": "string",
      "roles": ["string"]
    }
  }
  ```
- **Error Responses**:
  - 400: Missing credentials
  - 401: Invalid credentials

#### GET `/auth/validate`
- **Method**: GET
- **Description**: Validate current JWT token
- **Access**: Private (requires valid JWT)
- **Parameters**: None
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "message": "Token is valid"
  }
  ```
- **Error Responses**:
  - 401: Invalid or missing token

#### GET `/auth/logout`
- **Method**: GET
- **Description**: Logout user and invalidate tokens
- **Access**: Private (requires valid JWT)
- **Parameters**: None
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```
- **Error Responses**:
  - 401: Invalid or missing token

#### POST `/auth/refresh`
- **Method**: POST
- **Description**: Refresh access token using refresh token
- **Access**: Private (requires valid refresh token)
- **Parameters**:
  ```json
  {
    "refreshToken": "string (required)"
  }
  ```
- **Auth Requirements**: None (refresh token in body)
- **Expected Response**:
  ```json
  {
    "success": true,
    "token": "new JWT access token"
  }
  ```
- **Error Responses**:
  - 401: Invalid or missing refresh token

#### POST `/auth/change-password`
- **Method**: POST
- **Description**: Change user password with security validation
- **Access**: Private (requires valid JWT)
- **Parameters**:
  ```json
  {
    "currentPassword": "string (required)",
    "newPassword": "string (required)"
  }
  ```
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "message": "Password changed successfully"
  }
  ```
- **Error Responses**:
  - 400: Weak password
  - 401: Invalid current password or token

#### POST `/auth/forgot-password`
- **Method**: POST
- **Description**: Request password reset link via email
- **Access**: Public
- **Parameters**:
  ```json
  {
    "email": "string (required)"
  }
  ```
- **Auth Requirements**: None
- **Expected Response**:
  ```json
  {
    "success": true,
    "message": "Password reset email sent if user exists"
  }
  ```
- **Error Responses**:
  - 400: Invalid email format

#### POST `/auth/reset-password`
- **Method**: POST
- **Description**: Reset password using reset token
- **Access**: Public
- **Parameters**:
  ```json
  {
    "token": "string (required)",
    "newPassword": "string (required)"
  }
  ```
- **Auth Requirements**: None
- **Expected Response**:
  ```json
  {
    "success": true,
    "message": "Password reset successfully"
  }
  ```
- **Error Responses**:
  - 400: Invalid token or weak password

#### GET `/auth/me`
- **Method**: GET
- **Description**: Get current authenticated user information
- **Access**: Private (requires valid JWT)
- **Parameters**: None
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "user": {
      "_id": "string",
      "username": "string",
      "email": "string",
      "roles": ["string"],
      "createdAt": "date",
      "updatedAt": "date"
    }
  }
  ```
- **Error Responses**:
  - 401: Invalid or missing token

## User Endpoints

### Base Path: `/users`

#### POST `/users/signup`
- **Method**: POST
- **Description**: Register a new user
- **Access**: Public
- **Parameters**:
  ```json
  {
    "username": "string (required)",
    "email": "string (required)",
    "password": "string (required)"
  }
  ```
- **Auth Requirements**: None
- **Expected Response**:
  ```json
  {
    "success": true,
    "user": {
      "_id": "string",
      "username": "string",
      "email": "string",
      "roles": ["string"]
    }
  }
  ```
- **Error Responses**:
  - 400: Missing fields, weak password, duplicate username/email

## Campaign Endpoints

### Base Path: `/campaigns`

#### GET `/campaigns/list`
- **Method**: GET
- **Description**: List all campaigns for authenticated user
- **Access**: Private (requires valid JWT)
- **Parameters**: None
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "campaigns": [
      {
        "_id": "string",
        "name": "string",
        "description": "string",
        "dm": "userId",
        "players": ["userId"],
        "createdAt": "date",
        "updatedAt": "date"
      }
    ]
  }
  ```
- **Error Responses**:
  - 401: Invalid or missing token

#### POST `/campaigns/add`
- **Method**: POST
- **Description**: Create a new campaign
- **Access**: Private (requires valid JWT)
- **Parameters**:
  ```json
  {
    "name": "string (required)",
    "description": "string",
    "players": ["userId"]
  }
  ```
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "campaign": {
      "_id": "string",
      "name": "string",
      "description": "string",
      "dm": "userId",
      "players": ["userId"],
      "createdAt": "date",
      "updatedAt": "date"
    }
  }
  ```
- **Error Responses**:
  - 400: Missing name
  - 401: Invalid or missing token

#### POST `/campaigns/delete`
- **Method**: POST
- **Description**: Delete a campaign
- **Access**: Private (requires valid JWT)
- **Parameters**:
  ```json
  {
    "campaignId": "string (required)"
  }
  ```
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "message": "Campaign deleted successfully"
  }
  ```
- **Error Responses**:
  - 400: Missing campaignId
  - 401: Invalid or missing token
  - 403: User not authorized to delete campaign

#### POST `/campaigns/update`
- **Method**: POST
- **Description**: Update a campaign
- **Access**: Private (requires valid JWT)
- **Parameters**:
  ```json
  {
    "campaignId": "string (required)",
    "name": "string",
    "description": "string",
    "players": ["userId"]
  }
  ```
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "campaign": {
      "_id": "string",
      "name": "string",
      "description": "string",
      "dm": "userId",
      "players": ["userId"],
      "createdAt": "date",
      "updatedAt": "date"
    }
  }
  ```
- **Error Responses**:
  - 400: Missing campaignId
  - 401: Invalid or missing token
  - 403: User not authorized to update campaign

#### POST `/campaigns/join`
- **Method**: POST
- **Description**: Join a campaign
- **Access**: Private (requires valid JWT)
- **Parameters**:
  ```json
  {
    "campaignId": "string (required)"
  }
  ```
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "message": "Successfully joined campaign"
  }
  ```
- **Error Responses**:
  - 400: Missing campaignId
  - 401: Invalid or missing token
  - 404: Campaign not found

#### GET `/campaigns/:id`
- **Method**: GET
- **Description**: Get campaign details
- **Access**: Private (requires valid JWT)
- **Parameters**: None
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "campaign": {
      "_id": "string",
      "name": "string",
      "description": "string",
      "dm": "userId",
      "players": ["userId"],
      "createdAt": "date",
      "updatedAt": "date"
    }
  }
  ```
- **Error Responses**:
  - 401: Invalid or missing token
  - 404: Campaign not found

#### POST `/campaigns/:campaignId/maps`
- **Method**: POST
- **Description**: Add a map to a campaign
- **Access**: Private (requires valid JWT)
- **Parameters**:
  ```json
  {
    "mapId": "string (required)"
  }
  ```
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "campaign": {
      "_id": "string",
      "name": "string",
      "maps": ["mapId"]
    }
  }
  ```
- **Error Responses**:
  - 400: Missing mapId
  - 401: Invalid or missing token
  - 403: User not authorized to modify campaign
  - 404: Campaign not found

## Friend System Endpoints

### Base Path: `/friends`

#### POST `/friends/add`
- **Method**: POST
- **Description**: Send a friend request
- **Access**: Private (requires valid JWT)
- **Parameters**:
  ```json
  {
    "friendId": "string (required)"
  }
  ```
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "message": "Friend request sent"
  }
  ```
- **Error Responses**:
  - 400: Missing friendId
  - 401: Invalid or missing token
  - 404: User not found

#### GET `/friends/list`
- **Method**: GET
- **Description**: List all confirmed friends
- **Access**: Private (requires valid JWT)
- **Parameters**: None
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "friends": [
      {
        "_id": "string",
        "username": "string",
        "email": "string",
        "status": "confirmed"
      }
    ]
  }
  ```
- **Error Responses**:
  - 401: Invalid or missing token

#### GET `/friends/pending`
- **Method**: GET
- **Description**: List all pending friend requests
- **Access**: Private (requires valid JWT)
- **Parameters**: None
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "pending": [
      {
        "_id": "string",
        "username": "string",
        "email": "string",
        "status": "pending"
      }
    ]
  }
  ```
- **Error Responses**:
  - 401: Invalid or missing token

#### POST `/friends/confirm`
- **Method**: POST
- **Description**: Confirm a friend request
- **Access**: Private (requires valid JWT)
- **Parameters**:
  ```json
  {
    "friendId": "string (required)"
  }
  ```
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "message": "Friend request confirmed"
  }
  ```
- **Error Responses**:
  - 400: Missing friendId
  - 401: Invalid or missing token
  - 404: Friend request not found

#### POST `/friends/reject`
- **Method**: POST
- **Description**: Reject a friend request
- **Access**: Private (requires valid JWT)
- **Parameters**:
  ```json
  {
    "friendId": "string (required)"
  }
  ```
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "message": "Friend request rejected"
  }
  ```
- **Error Responses**:
  - 400: Missing friendId
  - 401: Invalid or missing token
  - 404: Friend request not found

#### POST `/friends/remove`
- **Method**: POST
- **Description**: Remove a friend
- **Access**: Private (requires valid JWT)
- **Parameters**:
  ```json
  {
    "friendId": "string (required)"
  }
  ```
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "message": "Friend removed"
  }
  ```
- **Error Responses**:
  - 400: Missing friendId
  - 401: Invalid or missing token
  - 404: Friend not found

## Map Endpoints

### Base Path: `/maps`

#### POST `/maps/`
- **Method**: POST
- **Description**: Create a new map
- **Access**: Private (requires valid JWT)
- **Parameters**:
  ```json
  {
    "name": "string (required)",
    "description": "string",
    "campaignId": "string",
    "gridSize": "number",
    "backgroundImage": "string"
  }
  ```
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "map": {
      "_id": "string",
      "name": "string",
      "description": "string",
      "owner": "userId",
      "campaignId": "string",
      "gridSize": "number",
      "backgroundImage": "string",
      "tokens": [],
      "createdAt": "date",
      "updatedAt": "date"
    }
  }
  ```
- **Error Responses**:
  - 400: Missing name
  - 401: Invalid or missing token

#### GET `/maps/:id`
- **Method**: GET
- **Description**: Get map details
- **Access**: Private (requires valid JWT)
- **Parameters**: None
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "map": {
      "_id": "string",
      "name": "string",
      "description": "string",
      "owner": "userId",
      "campaignId": "string",
      "gridSize": "number",
      "backgroundImage": "string",
      "tokens": [
        {
          "_id": "string",
          "name": "string",
          "position": {"x": "number", "y": "number"},
          "size": {"width": "number", "height": "number"},
          "image": "string",
          "visible": "boolean"
        }
      ],
      "createdAt": "date",
      "updatedAt": "date"
    }
  }
  ```
- **Error Responses**:
  - 401: Invalid or missing token
  - 404: Map not found

#### PUT `/maps/:id`
- **Method**: PUT
- **Description**: Update map (full replacement)
- **Access**: Private (requires valid JWT)
- **Parameters**:
  ```json
  {
    "name": "string",
    "description": "string",
    "gridSize": "number",
    "backgroundImage": "string"
  }
  ```
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "map": {
      "_id": "string",
      "name": "string",
      "description": "string",
      "owner": "userId",
      "campaignId": "string",
      "gridSize": "number",
      "backgroundImage": "string",
      "tokens": [],
      "createdAt": "date",
      "updatedAt": "date"
    }
  }
  ```
- **Error Responses**:
  - 401: Invalid or missing token
  - 403: User not authorized to update map
  - 404: Map not found

#### DELETE `/maps/:id`
- **Method**: DELETE
- **Description**: Delete a map
- **Access**: Private (requires valid JWT)
- **Parameters**: None
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "message": "Map deleted successfully"
  }
  ```
- **Error Responses**:
  - 401: Invalid or missing token
  - 403: User not authorized to delete map
  - 404: Map not found

#### PATCH `/maps/:id`
- **Method**: PATCH
- **Description**: Update map (partial update)
- **Access**: Private (requires valid JWT)
- **Parameters**:
  ```json
  {
    "name": "string",
    "description": "string",
    "gridSize": "number",
    "backgroundImage": "string"
  }
  ```
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "map": {
      "_id": "string",
      "name": "string",
      "description": "string",
      "owner": "userId",
      "campaignId": "string",
      "gridSize": "number",
      "backgroundImage": "string",
      "tokens": [],
      "createdAt": "date",
      "updatedAt": "date"
    }
  }
  ```
- **Error Responses**:
  - 401: Invalid or missing token
  - 403: User not authorized to update map
  - 404: Map not found

#### GET `/maps/campaign/:campaignId`
- **Method**: GET
- **Description**: Get all maps for a campaign
- **Access**: Private (requires valid JWT)
- **Parameters**: None
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "maps": [
      {
        "_id": "string",
        "name": "string",
        "description": "string",
        "owner": "userId",
        "campaignId": "string",
        "gridSize": "number",
        "backgroundImage": "string",
        "createdAt": "date",
        "updatedAt": "date"
      }
    ]
  }
  ```
- **Error Responses**:
  - 401: Invalid or missing token
  - 404: Campaign not found

#### PATCH `/maps/:id/tokens`
- **Method**: PATCH
- **Description**: Add a token to a map
- **Access**: Private (requires valid JWT)
- **Parameters**:
  ```json
  {
    "token": {
      "name": "string (required)",
      "position": {"x": "number", "y": "number"},
      "size": {"width": "number", "height": "number"},
      "image": "string",
      "visible": "boolean"
    }
  }
  ```
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "map": {
      "_id": "string",
      "tokens": ["token"]
    }
  }
  ```
- **Error Responses**:
  - 400: Missing token name
  - 401: Invalid or missing token
  - 403: User not authorized to modify map
  - 404: Map not found

#### PATCH `/maps/:id/tokens/:tokenId`
- **Method**: PATCH
- **Description**: Update a token on a map
- **Access**: Private (requires valid JWT)
- **Parameters**:
  ```json
  {
    "position": {"x": "number", "y": "number"},
    "size": {"width": "number", "height": "number"},
    "image": "string",
    "visible": "boolean"
  }
  ```
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "map": {
      "_id": "string",
      "tokens": ["updated token"]
    }
  }
  ```
- **Error Responses**:
  - 401: Invalid or missing token
  - 403: User not authorized to modify map
  - 404: Map or token not found

#### DELETE `/maps/:id/tokens/:tokenId`
- **Method**: DELETE
- **Description**: Delete a token from a map
- **Access**: Private (requires valid JWT)
- **Parameters**: None
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "message": "Token deleted successfully"
  }
  ```
- **Error Responses**:
  - 401: Invalid or missing token
  - 403: User not authorized to modify map
  - 404: Map or token not found

#### POST `/maps/analyze`
- **Method**: POST
- **Description**: Analyze a map image
- **Access**: Private (requires valid JWT)
- **Parameters**: Form-data with image file
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "analysis": {
      "gridSize": "number",
      "dimensions": {"width": "number", "height": "number"},
      "colorPalette": ["hex colors"]
    }
  }
  ```
- **Error Responses**:
  - 400: Invalid image file
  - 401: Invalid or missing token

## Character Endpoints

### Base Path: `/` (root)

#### GET `/campaigns/:campaignId/characters`
- **Method**: GET
- **Description**: Get all characters in a campaign
- **Access**: Private (requires valid JWT)
- **Parameters**: None
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "characters": [
      {
        "_id": "string",
        "name": "string",
        "description": "string",
        "owner": "userId",
        "campaignId": "string",
        "stats": {},
        "position": {"x": "number", "y": "number"},
        "createdAt": "date",
        "updatedAt": "date"
      }
    ]
  }
  ```
- **Error Responses**:
  - 401: Invalid or missing token
  - 404: Campaign not found

#### GET `/campaigns/:campaignId/characters/user`
- **Method**: GET
- **Description**: Get current user's characters in a campaign
- **Access**: Private (requires valid JWT)
- **Parameters**: None
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "characters": [
      {
        "_id": "string",
        "name": "string",
        "description": "string",
        "owner": "userId",
        "campaignId": "string",
        "stats": {},
        "position": {"x": "number", "y": "number"},
        "createdAt": "date",
        "updatedAt": "date"
      }
    ]
  }
  ```
- **Error Responses**:
  - 401: Invalid or missing token
  - 404: Campaign not found

#### POST `/campaigns/:campaignId/characters`
- **Method**: POST
- **Description**: Create a new character in a campaign
- **Access**: Private (requires valid JWT)
- **Parameters**:
  ```json
  {
    "name": "string (required)",
    "description": "string",
    "stats": {},
    "position": {"x": "number", "y": "number"}
  }
  ```
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "character": {
      "_id": "string",
      "name": "string",
      "description": "string",
      "owner": "userId",
      "campaignId": "string",
      "stats": {},
      "position": {"x": "number", "y": "number"},
      "createdAt": "date",
      "updatedAt": "date"
    }
  }
  ```
- **Error Responses**:
  - 400: Missing name
  - 401: Invalid or missing token
  - 404: Campaign not found

#### PATCH `/characters/:characterId`
- **Method**: PATCH
- **Description**: Update a character
- **Access**: Private (requires valid JWT)
- **Parameters**:
  ```json
  {
    "name": "string",
    "description": "string",
    "stats": {},
    "position": {"x": "number", "y": "number"}
  }
  ```
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "character": {
      "_id": "string",
      "name": "string",
      "description": "string",
      "owner": "userId",
      "campaignId": "string",
      "stats": {},
      "position": {"x": "number", "y": "number"},
      "createdAt": "date",
      "updatedAt": "date"
    }
  }
  ```
- **Error Responses**:
  - 401: Invalid or missing token
  - 403: User not authorized to update character
  - 404: Character not found

#### DELETE `/characters/:characterId`
- **Method**: DELETE
- **Description**: Delete a character
- **Access**: Private (requires valid JWT)
- **Parameters**: None
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "message": "Character deleted successfully"
  }
  ```
- **Error Responses**:
  - 401: Invalid or missing token
  - 403: User not authorized to delete character
  - 404: Character not found

#### POST `/characters/:characterId/place/:mapId`
- **Method**: POST
- **Description**: Place character on a map
- **Access**: Private (requires valid JWT)
- **Parameters**:
  ```json
  {
    "position": {"x": "number", "y": "number"}
  }
  ```
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "character": {
      "_id": "string",
      "position": {"x": "number", "y": "number"},
      "currentMap": "mapId"
    }
  }
  ```
- **Error Responses**:
  - 401: Invalid or missing token
  - 403: User not authorized to modify character
  - 404: Character or map not found

#### DELETE `/characters/:characterId/remove/:mapId`
- **Method**: DELETE
- **Description**: Remove character from a map
- **Access**: Private (requires valid JWT)
- **Parameters**: None
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "message": "Character removed from map"
  }
  ```
- **Error Responses**:
  - 401: Invalid or missing token
  - 403: User not authorized to modify character
  - 404: Character or map not found

#### PATCH `/characters/:characterId/position/:mapId`
- **Method**: PATCH
- **Description**: Update character position on a map
- **Access**: Private (requires valid JWT)
- **Parameters**:
  ```json
  {
    "position": {"x": "number", "y": "number"}
  }
  ```
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "character": {
      "_id": "string",
      "position": {"x": "number", "y": "number"}
    }
  }
  ```
- **Error Responses**:
  - 401: Invalid or missing token
  - 403: User not authorized to modify character
  - 404: Character or map not found

## Image Endpoints

### Base Path: `/images`

#### GET `/images/profile-photo-upload`
- **Method**: GET
- **Description**: Get URL for profile photo upload
- **Access**: Private (requires valid JWT)
- **Parameters**: None
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "uploadUrl": "string",
    "fileName": "string"
  }
  ```
- **Error Responses**:
  - 401: Invalid or missing token

#### POST `/images/update-profile-photo`
- **Method**: POST
- **Description**: Update user's profile photo
- **Access**: Private (requires valid JWT)
- **Parameters**:
  ```json
  {
    "fileName": "string (required)",
    "fileType": "string (required)"
  }
  ```
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "user": {
      "_id": "string",
      "profilePhoto": "string"
    }
  }
  ```
- **Error Responses**:
  - 400: Missing parameters
  - 401: Invalid or missing token

#### GET `/images/profile-photo-download-url`
- **Method**: GET
- **Description**: Get URL for profile photo download
- **Access**: Private (requires valid JWT)
- **Parameters**: None
- **Auth Requirements**: Bearer token in Authorization header
- **Expected Response**:
  ```json
  {
    "success": true,
    "downloadUrl": "string"
  }
  ```
- **Error Responses**:
  - 401: Invalid or missing token
  - 404: No profile photo found

## Asset Endpoints

### Base Path: `/assets`

#### POST `/assets/upload-url`
- **Method**: POST
- **Description**: Get URL for asset upload
- **Access**: Private (requires simple auth)
- **Parameters**:
  ```json
  {
    "fileName": "string (required)",
    "fileType": "string (required)",
    "campaignId": "string (required)"
  }
  ```
- **Auth Requirements**: Simple authentication
- **Expected Response**:
  ```json
  {
    "success": true,
    "uploadUrl": "string",
    "assetId": "string"
  }
  ```
- **Error Responses**:
  - 400: Missing parameters
  - 401: Invalid authentication

#### POST `/assets/confirm-upload`
- **Method**: POST
- **Description**: Confirm asset upload
- **Access**: Private (requires simple auth)
- **Parameters**:
  ```json
  {
    "assetId": "string (required)",
    "fileName": "string (required)",
    "fileType": "string (required)",
    "campaignId": "string (required)"
  }
  ```
- **Auth Requirements**: Simple authentication
- **Expected Response**:
  ```json
  {
    "success": true,
    "asset": {
      "_id": "string",
      "fileName": "string",
      "fileType": "string",
      "campaignId": "string",
      "url": "string",
      "createdAt": "date"
    }
  }
  ```
- **Error Responses**:
  - 400: Missing parameters
  - 401: Invalid authentication

#### GET `/assets/campaign/:campaignId`
- **Method**: GET
- **Description**: Get all assets for a campaign
- **Access**: Private (requires simple auth)
- **Parameters**: None
- **Auth Requirements**: Simple authentication
- **Expected Response**:
  ```json
  {
    "success": true,
    "assets": [
      {
        "_id": "string",
        "fileName": "string",
        "fileType": "string",
        "campaignId": "string",
        "url": "string",
        "createdAt": "date"
      }
    ]
  }
  ```
- **Error Responses**:
  - 401: Invalid authentication
  - 404: Campaign not found

#### GET `/assets/download/:id`
- **Method**: GET
- **Description**: Get download URL for an asset
- **Access**: Private (requires simple auth)
- **Parameters**: None
- **Auth Requirements**: Simple authentication
- **Expected Response**:
  ```json
  {
    "success": true,
    "downloadUrl": "string"
  }
  ```
- **Error Responses**:
  - 401: Invalid authentication
  - 404: Asset not found

## Health Check

### GET `/health`
- **Method**: GET
- **Description**: Health check endpoint
- **Access**: Public
- **Parameters**: None
- **Auth Requirements**: None
- **Expected Response**:
  ```json
  {
    "status": "ok",
    "service": "backend"
  }
  ```
- **Error Responses**: None expected

## API Routes (Frontend)

### Base Path: `/api`

#### POST `/api/forgot-password`
- **Method**: POST
- **Description**: Handle forgot password request (frontend API route)
- **Access**: Public
- **Parameters**:
  ```json
  {
    "email": "string (required)"
  }
  ```
- **Auth Requirements**: None
- **Expected Response**: Same as `/auth/forgot-password`

#### POST `/api/reset-password`
- **Method**: POST
- **Description**: Handle password reset request (frontend API route)
- **Access**: Public
- **Parameters**:
  ```json
  {
    "token": "string (required)",
    "newPassword": "string (required)"
  }
  ```
- **Auth Requirements**: None
- **Expected Response**: Same as `/auth/reset-password`
