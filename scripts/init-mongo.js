// MongoDB initialization script
db = db.getSiblingDB('vttless');

// Create collections with indexes
db.createCollection('users');
db.createCollection('campaigns');
db.createCollection('sessions');
db.createCollection('assets');

// Create indexes for users collection
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ 'passwordResetToken': 1 });
db.users.createIndex({ 'passwordResetTokenExpiry': 1 });

// Create indexes for campaigns collection
db.campaigns.createIndex({ 'owner': 1 });
db.campaigns.createIndex({ 'players': 1 });
db.campaigns.createIndex({ 'isPublic': 1 });

// Create indexes for sessions collection
db.sessions.createIndex({ 'user': 1 });
db.sessions.createIndex({ 'campaign': 1 });
db.sessions.createIndex({ 'expiresAt': 1 }, { expireAfterSeconds: 0 });

// Create indexes for assets collection
db.assets.createIndex({ 'owner': 1 });
db.assets.createIndex({ 'campaign': 1 });
db.assets.createIndex({ 'type': 1 });

print('VTTless database initialized successfully');