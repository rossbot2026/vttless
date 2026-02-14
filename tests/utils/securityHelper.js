/**
 * Security Helper for Testing
 * Provides utilities for testing security aspects
 */

class SecurityHelper {
  /**
   * Generate various types of malicious input for testing
   */
  static generateMaliciousInput() {
    return {
      // SQL Injection attempts
      sqlInjection: "'; DROP TABLE users; --",
      sqlInjection2: "1' OR '1'='1",
      sqlInjection3: "admin'--",
      
      // XSS (Cross-Site Scripting) attempts
      xss: '<script>alert("xss")</script>',
      xss2: '<img src="x" onerror="alert(\'xss\')">',
      xss3: 'javascript:alert("xss")',
      
      // Command Injection attempts
      commandInjection: '$(rm -rf /)',
      commandInjection2: '|| rm -rf /',
      commandInjection3: '; cat /etc/passwd',
      
      // Path Traversal attempts
      pathTraversal: '../../../etc/passwd',
      pathTraversal2: '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
      pathTraversal3: '....//....//etc/passwd',
      
      // Large input for testing buffer overflow
      largeInput: 'a'.repeat(10000),
      largeInput2: 'a'.repeat(50000),
      
      // Null byte injection
      nullByte: 'test\x00malicious',
      
      // Format string attacks
      formatString: '%x%x%x',
      
      // LDAP injection
      ldapInjection: '*)(objectClass=*))%00',
      
      // XML External Entity (XXE) attacks
      xxe: `<?xml version="1.0" encoding="ISO-8859-1"?>
<!DOCTYPE foo [
<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<foo>&xxe;</foo>`,
      
      // CSV injection
      csvInjection: `=cmd|' /C calc'!A0`,
      
      // Content-Type spoofing
      maliciousContentType: 'text/html<script>alert("xss")</script>',
      
      // Unicode attacks
      unicodeAttack: '\u202e\u202d\u202c\u202b',
      
      // Null payload
      nullPayload: null,
      
      // Empty payload
      emptyPayload: '',
      
      // Array payload (when expecting string)
      arrayPayload: ['malicious', 'data'],
      
      // Object payload (when expecting string)
      objectPayload: { malicious: 'data' }
    };
  }

  /**
   * Generate valid input for testing
   */
  static generateValidInput() {
    return {
      username: 'testuser123',
      email: 'test@example.com',
      password: 'ValidPassword123!',
      campaignName: 'Test Campaign',
      description: 'A test campaign for testing purposes',
      mapName: 'Test Map',
      characterName: 'Test Character'
    };
  }

  /**
   * Analyze response for security vulnerabilities
   */
  static analyzeResponseForSecurity(response) {
    const securityIssues = [];
    
    // Check for sensitive information in response
    if (response.text.includes('password')) {
      securityIssues.push('Password information leaked in response');
    }
    
    if (response.text.includes('secret')) {
      securityIssues.push('Secret information leaked in response');
    }
    
    if (response.text.includes('token') && response.status !== 401) {
      securityIssues.push('Token information leaked in response');
    }
    
    // Check for stack traces
    if (response.text.includes('stack trace') || response.text.includes('Error:')) {
      securityIssues.push('Stack trace exposed in response');
    }
    
    // Check for database errors
    if (response.text.includes('database') || response.text.includes('MongoError')) {
      securityIssues.push('Database errors exposed in response');
    }
    
    // Check for internal server details
    if (response.text.includes('internal server error') || response.text.includes('500')) {
      securityIssues.push('Internal server details exposed');
    }
    
    // Check for file system paths
    if (response.text.includes('/') && response.text.includes('.js')) {
      securityIssues.push('File system paths exposed');
    }
    
    return securityIssues;
  }

  /**
   * Check if response has appropriate security headers
   */
  static checkSecurityHeaders(response) {
    const securityHeaders = [];
    const headers = response.headers;
    
    // Check for security headers
    if (!headers['x-content-type-options']) {
      securityHeaders.push('Missing X-Content-Type-Options header');
    }
    
    if (!headers['x-frame-options']) {
      securityHeaders.push('Missing X-Frame-Options header');
    }
    
    if (!headers['x-xss-protection']) {
      securityHeaders.push('Missing XSS-Protection header');
    }
    
    if (!headers['strict-transport-security']) {
      securityHeaders.push('Missing HSTS header');
    }
    
    if (!headers['content-security-policy']) {
      securityHeaders.push('Missing CSP header');
    }
    
    return securityHeaders;
  }

  /**
   * Generate test cases for input validation
   */
  static generateValidationTestCases() {
    return {
      valid: this.generateValidInput(),
      invalid: this.generateMaliciousInput(),
      edgeCases: {
        tooShortUsername: 'a',
        tooLongUsername: 'a'.repeat(51),
        tooShortPassword: 'short',
        tooLongPassword: 'a'.repeat(129),
        invalidEmail: 'invalid-email',
        emptyFields: {},
        whitespaceOnly: {
          username: '   ',
          email: '   ',
          password: '   '
        }
      }
    };
  }
}

module.exports = SecurityHelper;