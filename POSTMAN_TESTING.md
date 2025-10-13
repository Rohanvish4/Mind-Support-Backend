# MindSupport Backend API Testing Guide

## Quick Start (Without MongoDB)

Since MongoDB isn't installed locally, here are your options:

### Option 1: Use MongoDB Atlas (Cloud - Recommended)
1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create a free account and cluster
3. Get your connection string
4. Update `.env` file:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mindsupport?retryWrites=true&w=majority
   ```

### Option 2: Install MongoDB Locally
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Option 3: Test Without Database (Basic Routes Only)
We can test basic routes like health check without database connection.

## API Endpoints to Test in Postman

### 1. Health Check (No Auth Required)
- **Method**: GET
- **URL**: `http://localhost:3000/health`
- **Expected Response**: 
```json
{
  "status": "healthy",
  "timestamp": "2025-10-13T22:01:35.123Z",
  "uptime": 123.456,
  "environment": "development"
}
```

### 2. User Registration
- **Method**: POST
- **URL**: `http://localhost:3000/api/auth/register`
- **Headers**: 
  - `Content-Type: application/json`
- **Body** (raw JSON):
```json
{
  "email": "test@example.com",
  "password": "password123",
  "displayName": "Test User"
}
```

### 3. User Login
- **Method**: POST
- **URL**: `http://localhost:3000/api/auth/login`
- **Headers**: 
  - `Content-Type: application/json`
- **Body** (raw JSON):
```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

### 4. Get Stream Token (Requires Auth)
- **Method**: POST
- **URL**: `http://localhost:3000/api/stream/token`
- **Headers**: 
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_ACCESS_TOKEN_HERE`
- **Body** (raw JSON):
```json
{
  "anonymousHandle": "CoolUser123"
}
```

### 5. Get Daily Tips
- **Method**: GET
- **URL**: `http://localhost:3000/api/tips`
- **Query Parameters**: 
  - `page=1`
  - `limit=10`

### 6. Publish Daily Tip (Admin Only)
- **Method**: POST
- **URL**: `http://localhost:3000/api/tips/publish`
- **Headers**: 
  - `Content-Type: application/json`
  - `Authorization: Bearer ADMIN_TOKEN_OR_PUBLISH_SECRET`
- **Body** (raw JSON):
```json
{
  "content": "Take a moment to breathe deeply and appreciate this moment.",
  "type": "text"
}
```

## Testing Flow

1. **Start with Health Check** - Verify server is running
2. **Register a User** - Create test account
3. **Login** - Get access token
4. **Use Protected Routes** - Test with Bearer token
5. **Test Error Cases** - Try invalid data, missing auth, etc.

## Common HTTP Status Codes

- **200**: Success
- **201**: Created (registration success)
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (missing/invalid token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **409**: Conflict (user already exists)
- **429**: Too Many Requests (rate limited)
- **500**: Internal Server Error

## Environment Variables You Need

At minimum for testing:
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=super-secret-jwt-key-at-least-32-chars-long-for-development
JWT_REFRESH_SECRET=super-secret-refresh-key-at-least-32-chars-for-dev
STREAM_API_KEY=demo-stream-api-key-change-in-production
STREAM_API_SECRET=demo-stream-secret-change-in-production
PUBLISH_SECRET=demo-publish-secret-16-chars
```