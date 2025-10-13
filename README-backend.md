# MindSupport Backend API

Complete Node.js + Express + TypeScript backend for MindSupport - a mobile-first mental health support platform with peer counseling and advanced moderation.

## 🚀 Features

- **JWT Authentication**: Secure access and refresh token flow
- **Stream Chat Integration**: Server-side SDK for privileged chat operations
- **Advanced Moderation**: Keyword scanning, webhook processing, queue management
- **Anonymous Support**: Ephemeral identities for privacy-focused conversations
- **Rate Limiting**: Redis-backed or in-memory rate limiting
- **Crisis Detection**: Automatic detection and resource delivery for high-risk messages
- **Daily Tips**: Scheduled mental health tips via GitHub Actions
- **Comprehensive Logging**: Structured JSON logging with Winston
- **Production Ready**: Helmet, CORS, error handling, audit logs

## 📋 Prerequisites

- Node.js 18+ and npm
- MongoDB 6+ (MongoDB Atlas recommended)
- Stream Chat account (get API keys from [getstream.io](https://getstream.io))
- Redis (optional, for production rate limiting)

## 🛠️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/Rohanvish4/mindsupport-backend.git
cd mindsupport-backend/server
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

**Required variables:**

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mindsupport?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
STREAM_API_KEY=your-stream-api-key
STREAM_API_SECRET=your-stream-api-secret
PUBLISH_SECRET=your-publish-secret-for-scheduled-jobs
```

### 4. Seed moderation keywords

```bash
npm run seed:keywords
```

### 5. Start development server

```bash
npm run dev
```

Server will run on `http://localhost:3000`

## 🏗️ Project Structure

```
server/
├── src/
│   ├── config/          # Configuration (env validation)
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Auth, validation, rate limiting, error handling
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Express routes
│   ├── services/        # Business logic (Stream, auth, moderation)
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utilities (logger, database)
│   ├── index.ts         # Main Express app
│   └── vercel.ts        # Vercel serverless entry
├── tests/
│   ├── unit/            # Unit tests
│   └── mocks/           # Test mocks
├── scripts/
│   └── seedKeywords.ts  # Seed moderation keywords
├── .github/workflows/   # CI/CD and scheduled jobs
├── package.json
├── tsconfig.json
└── README-backend.md
```

## 🔌 API Endpoints

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | Login user | Public |
| POST | `/api/auth/refresh` | Refresh access token | Public |

### Stream Chat

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/stream/token` | Get Stream token | Private |
| POST | `/api/stream/createChannel` | Create channel | Private |
| POST | `/api/stream/joinChannel` | Join channel | Private |

### Reporting & Moderation

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/report` | Create report | Public/Optional |
| GET | `/api/report` | Get reports | Moderator |
| POST | `/api/moderation/resolve` | Resolve moderation action | Moderator |
| GET | `/api/moderation/queue` | Get moderation queue | Moderator |
| POST | `/api/moderation/queue/:id/process` | Process queue item | Moderator |

### Webhooks

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/webhook/stream` | Stream webhook events | Signature |

### Daily Tips

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/tips/publish` | Publish daily tip | Admin/Secret |
| GET | `/api/tips` | Get daily tips | Public |

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

## 🚢 Deployment

### Vercel (Serverless)

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Set environment variables in Vercel dashboard
4. Deploy: `vercel --prod`

### Render (Web Service)

1. Connect your GitHub repo to Render
2. Use `render.yaml` for configuration
3. Set environment variables in Render dashboard
4. Deploy automatically on push to main

### Railway

1. Install Railway CLI: `npm i -g @railway/cli`
2. Run: `railway init`
3. Run: `railway up`
4. Set environment variables: `railway variables`

### Heroku

```bash
heroku create mindsupport-api
heroku addons:create mongolab:sandbox
heroku config:set JWT_SECRET=your-secret
git push heroku main
```

## 📊 Monitoring

### Logs

- Development: Console logs with colors
- Production: JSON logs to `logs/` directory

### Sentry Integration (Optional)

Set `SENTRY_DSN` in environment variables for error tracking.

### Health Check

```bash
curl http://localhost:3000/health
```

## 🔒 Security Best Practices

- ✅ Never commit `.env` file
- ✅ Use strong JWT secrets (min 32 characters)
- ✅ Enable HTTPS in production
- ✅ Set proper CORS origins
- ✅ Use helmet for security headers
- ✅ Implement rate limiting on all endpoints
- ✅ Validate all user inputs with Zod
- ✅ Never expose Stream API secret to client
- ✅ Verify webhook signatures
- ✅ Implement audit logging for sensitive actions

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open pull request

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Support

- Documentation: [See API-DOCS.html](./API-DOCS.html)
- Issues: [GitHub Issues](https://github.com/Rohanvish4/mindsupport-backend/issues)
- Email: support@mindsupport.app

## 🙏 Acknowledgments

- [Stream Chat](https://getstream.io) for real-time messaging
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) for database hosting
- Mental health organizations for crisis resource information

---

Built with ❤️ by [@Rohanvish4](https://github.com/Rohanvish4) for MindSupport