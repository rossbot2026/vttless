const request = require('supertest');
const app = require('./backend/index');

async function testChangePassword() {
  const testUser = {
    username: 'apitester',
    email: 'apitester@example.com',
    password: 'SecurePass123!'
  };

  // Clean up
  const User = require('./backend/models/user');
  await User.deleteMany({});

  // Signup
  await request(app).post('/users/signup').send(testUser);
  
  // Login
  const loginResponse = await request(app)
    .post('/auth/login')
    .send({ email: testUser.email, password: testUser.password });
  
  const authToken = loginResponse.body.token;
  console.log('Login successful, token:', authToken.substring(0, 20) + '...');

  // Change password
  const response = await request(app)
    .post('/auth/change-password')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ currentPassword: testUser.password, newPassword: 'NewSecurePass123!' });

  console.log('Change password response:', {
    status: response.status,
    body: response.body
  });

  process.exit(0);
}

testChangePassword().catch(console.error);