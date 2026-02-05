/**
 * Authentication Helper for Testing
 * Provides utilities for testing authentication functionality
 */

const request = require('supertest');
const app = require('../../backend/index');
const mockTokens = require('../fixtures/tokens');

class AuthHelper {
  /**
   * Login with user credentials and return response
   */
  static async login(userData) {
    return await request(app)
      .post('/auth/login')
      .send(userData);
  }

  /**
   * Login successfully and return token and user data
   */
  static async loginSuccessfully(userData) {
    const response = await this.login(userData);
    
    if (response.status !== 200) {
      throw new Error(`Login failed: ${response.body.message}`);
    }
    
    return {
      token: response.body.tokens.accessToken,
      refreshToken: response.body.tokens.refreshToken,
      user: response.body.user
    };
  }

  /**
   * Get authentication headers with Bearer token
   */
  static getAuthHeaders(token) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Get refresh headers with refresh token cookie
   */
  static getRefreshHeaders(refreshToken) {
    return {
      'Cookie': `vttless-refresh=${refreshToken}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Get protected resource with authentication
   */
  static async getProtectedResource(endpoint, token) {
    return await request(app)
      .get(endpoint)
      .set(this.getAuthHeaders(token));
  }

  /**
   * Post to protected resource with authentication
   */
  static async postToProtectedResource(endpoint, token, data) {
    return await request(app)
      .post(endpoint)
      .set(this.getAuthHeaders(token))
      .send(data);
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(refreshToken) {
    return await request(app)
      .post('/auth/refresh')
      .set(this.getRefreshHeaders(refreshToken));
  }

  /**
   * Logout user
   */
  static async logout(token) {
    return await request(app)
      .get('/auth/logout')
      .set(this.getAuthHeaders(token));
  }

  /**
   * Validate token and get user info
   */
  static async validateToken(token) {
    return await request(app)
      .get('/auth/validate')
      .set(this.getAuthHeaders(token));
  }

  /**
   * Get current user information
   */
  static async getCurrentUser(token) {
    return await request(app)
      .get('/auth/me')
      .set(this.getAuthHeaders(token));
  }

  /**
   * Change password
   */
  static async changePassword(token, passwordData) {
    return await request(app)
      .post('/auth/change-password')
      .set(this.getAuthHeaders(token))
      .send(passwordData);
  }
}

module.exports = AuthHelper;