# MindSupport Flutter Mobile App - Comprehensive Development Guide

## 🎯 Project Overview

You are developing **MindSupport**, a privacy-focused mental health support mobile application using Flutter. This is a peer counseling platform with advanced moderation, anonymous chat capabilities, and crisis intervention features.

### Core Mission
Create a safe, supportive mobile environment where users can:
- Engage in anonymous peer counseling conversations
- Access daily mental health tips and resources
- Report inappropriate content with robust moderation
- Connect with trained counselors when needed
- Maintain privacy through ephemeral identities

## 🏗️ Backend API Integration

### Base Configuration
```yaml
API Base URL: http://localhost:3000 (Development)
Production URL: [To be configured]
```

### Authentication System
**JWT-based authentication with dual token system:**

#### Auth Endpoints:
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login  
- `POST /api/auth/refresh` - Token refresh
- `GET /api/auth/me` - Get current user profile

#### Request/Response Models:
```dart
// Registration Request
class RegisterRequest {
  final String email;
  final String password;
  final String displayName;
}

// Login Request  
class LoginRequest {
  final String email;
  final String password;
}

// Auth Response
class AuthResponse {
  final String accessToken;
  final String refreshToken;
  final User user;
  final DateTime expiresAt;
}

// User Model
class User {
  final String id;
  final String email;
  final String displayName;
  final String? avatarUrl;
  final UserRole role; // user, moderator, admin
  final bool isCounselor;
  final List<String> tags;
  final bool isBanned;
  final DateTime createdAt;
  final DateTime lastSeenAt;
}
```

### Stream Chat Integration
**Real-time messaging with privacy features:**

#### Stream Endpoints:
- `POST /api/stream/token` - Get Stream Chat token
- `POST /api/stream/anonymous-handle` - Create anonymous identity
- `POST /api/stream/createChannel` - Create chat room
- `POST /api/stream/joinChannel` - Join existing room

#### Anonymous Chat System:
```dart
// Anonymous Handle Request
class AnonymousHandleRequest {
  final String anonymousHandle; // User-chosen anonymous name
}

// Stream Token Response
class StreamTokenResponse {
  final String token;
  final StreamUser user;
  final EphemeralData? ephemeral; // For anonymous users
}

// Ephemeral Identity
class EphemeralData {
  final String id;
  final String token;
  final String handle;
  final DateTime expiresAt; // 24-hour expiry
}
```

### Mental Health Content System

#### Daily Tips:
- `GET /api/tips` - Fetch daily mental health tips
- `GET /api/tips?page=1&limit=30` - Paginated tips history

```dart
class DailyTip {
  final String id; // YYYYMMDD format
  final String content;
  final TipType type; // text, activity, image, video
  final DateTime publishedAt;
  final String publishedBy;
}
```

### Reporting & Moderation System

#### Report Endpoints:
- `POST /api/report/submit` - Submit content report
- `GET /api/moderation/queue` - Get moderation queue (moderators only)

```dart
// Report Submission
class ReportRequest {
  final ReportTargetType targetType; // message, user, channel, resource
  final String targetId;
  final String reason;
}

// Report Status
enum ReportStatus { open, underReview, resolved }
```

### Health & System Endpoints:
- `GET /health` - Application health check
- `POST /api/webhook/stream` - Stream Chat webhooks (internal)

## 📱 Flutter App Architecture

### Recommended Project Structure:
```
lib/
├── main.dart
├── app/
│   ├── app.dart
│   ├── router.dart
│   └── theme.dart
├── core/
│   ├── constants/
│   ├── errors/
│   ├── services/
│   └── utils/
├── data/
│   ├── datasources/
│   ├── models/
│   └── repositories/
├── domain/
│   ├── entities/
│   ├── repositories/
│   └── usecases/
├── presentation/
│   ├── pages/
│   ├── widgets/
│   └── providers/
└── features/
    ├── auth/
    ├── chat/
    ├── tips/
    ├── reports/
    └── profile/
```

## 🔐 Security Implementation

### Authentication Flow:
1. **Login/Register** → Store tokens securely (flutter_secure_storage)
2. **Token Refresh** → Automatic refresh on 401 responses
3. **Logout** → Clear tokens and Stream Chat session

### Privacy Features:
- **Anonymous Mode**: Allow users to chat without revealing identity
- **Ephemeral Sessions**: 24-hour anonymous sessions
- **Data Encryption**: Encrypt sensitive data at rest
- **Secure Storage**: Use flutter_secure_storage for tokens

## 💬 Stream Chat Integration

### Required Dependencies:
```yaml
dependencies:
  stream_chat_flutter: ^7.0.0
  stream_chat_flutter_core: ^6.0.0
```

### Implementation Pattern:
```dart
// Initialize Stream Chat
final client = StreamChatClient('YOUR_API_KEY');

// Connect user (authenticated)
await client.connectUser(
  User(id: userId, name: displayName),
  token,
);

// Connect anonymous user
await client.connectUser(
  User(id: ephemeralId, name: anonymousHandle),
  ephemeralToken,
);

// Create/Join channel
final channel = client.channel('messaging', id: channelId);
await channel.watch();
```

### Chat Features to Implement:
- **1-on-1 Counseling**: Private conversations with counselors
- **Group Support**: Themed support group channels
- **Anonymous Chat**: Privacy-focused conversations
- **Message Reporting**: In-app report submission
- **Crisis Detection**: Automatic resource delivery for high-risk content

## 🎨 UI/UX Requirements

### Design Principles:
- **Calming Color Palette**: Soft blues, greens, neutral tones
- **Accessibility**: High contrast, screen reader support
- **Privacy-First**: Clear privacy indicators, anonymous mode toggle
- **Crisis-Aware**: Emergency resources always accessible

### Key Screens:

#### 1. Authentication Flow:
- Welcome/Onboarding
- Login/Register
- Privacy explanation
- Terms acceptance

#### 2. Main Navigation:
- **Home**: Daily tips, crisis resources
- **Chat**: Active conversations
- **Support**: Find counselors, join groups
- **Profile**: Settings, privacy controls

#### 3. Chat Interface:
- Channel list with privacy indicators
- Anonymous mode toggle
- Message composer with emoji support
- Report button on messages
- Crisis resource quick access

#### 4. Support Features:
- Daily tips carousel
- Crisis resources (always accessible)
- Counselor matching
- Anonymous handle generator

## 🚨 Crisis Intervention Features

### Critical Implementation:
- **Emergency Contacts**: National/local crisis hotlines
- **Resource Detection**: Auto-show resources for crisis keywords
- **Quick Access**: Emergency button always visible
- **Professional Referral**: Connect to trained counselors

### Crisis Resources to Include:
```dart
class CrisisResource {
  final String name;
  final String phone;
  final String? url;
  final String description;
  final String availability; // "24/7", "Business hours", etc.
}

// Example resources:
- National Suicide Prevention Lifeline: 988
- Crisis Text Line: Text HOME to 741741
- SAMHSA National Helpline: 1-800-662-4357
```

## 📊 State Management

### Recommended: Riverpod + Flutter Hooks
```dart
// Auth State
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(authRepositoryProvider));
});

// Stream Chat State  
final streamChatProvider = Provider<StreamChatClient>((ref) {
  return StreamChatClient('API_KEY');
});

// Anonymous Mode State
final anonymousModeProvider = StateProvider<bool>((ref) => false);
```

## 🔄 Data Flow Patterns

### Repository Pattern Implementation:
```dart
abstract class AuthRepository {
  Future<AuthResponse> login(LoginRequest request);
  Future<AuthResponse> register(RegisterRequest request);
  Future<AuthResponse> refreshToken(String refreshToken);
  Future<User> getCurrentUser();
}

class AuthRepositoryImpl implements AuthRepository {
  final ApiClient _apiClient;
  final SecureStorage _storage;
  
  // Implementation with error handling
}
```

## ⚡ Performance Considerations

### Optimization Strategies:
- **Lazy Loading**: Load chat history on demand
- **Image Caching**: Cache user avatars and media
- **Connection Management**: Properly handle Stream Chat connections
- **Memory Management**: Dispose controllers and streams properly

### Background Processing:
- **Token Refresh**: Background token refresh
- **Message Sync**: Sync messages when app becomes active
- **Notification Handling**: Firebase Cloud Messaging integration

## 🧪 Testing Strategy

### Test Coverage:
- **Unit Tests**: Business logic, repositories, services
- **Widget Tests**: UI components, user interactions
- **Integration Tests**: API calls, Stream Chat integration
- **E2E Tests**: Complete user flows

### Critical Test Scenarios:
- Anonymous chat creation and expiry
- Token refresh handling
- Crisis resource accessibility
- Report submission flow
- Network connectivity issues

## 🚀 Development Phases

### Phase 1: Foundation (Week 1-2)
- Project setup and architecture
- Authentication implementation
- Basic UI framework
- API client setup

### Phase 2: Core Chat (Week 3-4)
- Stream Chat integration
- Anonymous mode implementation
- Basic chat UI
- Message reporting

### Phase 3: Support Features (Week 5-6)
- Daily tips implementation
- Crisis resources integration
- Counselor matching
- Advanced UI polish

### Phase 4: Production Ready (Week 7-8)
- Comprehensive testing
- Performance optimization
- Security audit
- App store preparation

## 🔧 Development Environment Setup

### Required Dependencies:
```yaml
dependencies:
  flutter: sdk: flutter
  
  # HTTP & API
  dio: ^5.3.0
  retrofit: ^4.0.0
  json_annotation: ^4.8.0
  
  # State Management
  flutter_riverpod: ^2.4.0
  flutter_hooks: ^0.20.0
  hooks_riverpod: ^2.4.0
  
  # Stream Chat
  stream_chat_flutter: ^7.0.0
  stream_chat_flutter_core: ^6.0.0
  
  # Storage & Security
  flutter_secure_storage: ^9.0.0
  hive: ^2.2.3
  hive_flutter: ^1.1.0
  
  # UI & Navigation
  go_router: ^12.0.0
  flutter_screenutil: ^5.9.0
  cached_network_image: ^3.3.0
  
  # Utilities
  equatable: ^2.0.5
  freezed_annotation: ^2.4.1
  
dev_dependencies:
  build_runner: ^2.4.0
  json_serializable: ^6.7.0
  retrofit_generator: ^8.0.0
  freezed: ^2.4.6
  mockito: ^5.4.0
  flutter_test: sdk: flutter
```

### API Client Setup:
```dart
@RestApi(baseUrl: "http://localhost:3000/api")
abstract class ApiClient {
  factory ApiClient(Dio dio, {String baseUrl}) = _ApiClient;
  
  @POST("/auth/login")
  Future<AuthResponse> login(@Body() LoginRequest request);
  
  @POST("/auth/register") 
  Future<AuthResponse> register(@Body() RegisterRequest request);
  
  @POST("/stream/token")
  Future<StreamTokenResponse> getStreamToken(@Body() StreamTokenRequest request);
  
  @GET("/tips")
  Future<PaginatedResponse<DailyTip>> getTips(@Queries() Map<String, dynamic> queries);
}
```

## 🎯 Success Metrics

### Key Performance Indicators:
- **User Engagement**: Daily/monthly active users
- **Chat Activity**: Messages sent, channels created
- **Crisis Intervention**: Resources accessed, referrals made
- **Content Moderation**: Reports submitted, resolution time
- **User Retention**: Return rates, session duration

### Quality Metrics:
- **Crash Rate**: < 0.1%
- **API Response Time**: < 500ms average
- **App Launch Time**: < 3 seconds
- **Memory Usage**: Efficient with large chat histories

## 📋 Development Checklist

### Pre-Development:
- [ ] Backend API validation complete
- [ ] Stream Chat credentials configured
- [ ] Design system finalized
- [ ] Privacy policy drafted
- [ ] Crisis resources compiled

### Development Milestones:
- [ ] Authentication flow complete
- [ ] Anonymous chat working
- [ ] Daily tips integrated
- [ ] Crisis resources accessible
- [ ] Report system functional
- [ ] Comprehensive testing done
- [ ] Performance optimized
- [ ] Security reviewed

### Launch Preparation:
- [ ] App store assets created
- [ ] Privacy policy published  
- [ ] Terms of service finalized
- [ ] Beta testing completed
- [ ] Production environment configured

## 🔒 Privacy & Compliance

### Privacy Features:
- **Data Minimization**: Collect only necessary data
- **Anonymous Options**: Full anonymous chat capability
- **Data Retention**: Clear policies on data lifecycle
- **User Control**: Easy data export/deletion

### Compliance Considerations:
- **HIPAA Awareness**: Mental health data sensitivity
- **GDPR Compliance**: EU user data protection
- **COPPA**: Age verification for users under 13
- **App Store Guidelines**: Mental health app requirements

---

## 🎯 Final Implementation Notes

This comprehensive guide provides everything needed to build a production-ready mental health support app with Flutter. The backend API is fully functional and tested, Stream Chat integration is validated, and all security measures are in place.

**Priority Focus Areas:**
1. **User Privacy**: Anonymous chat is the killer feature
2. **Crisis Support**: Emergency resources must be always accessible  
3. **Content Safety**: Robust moderation and reporting system
4. **User Experience**: Calming, intuitive interface design

The backend provides a solid foundation with JWT authentication, Stream Chat integration, anonymous identity management, daily tips system, and comprehensive moderation tools. Your Flutter app should leverage these capabilities to create a safe, supportive environment for mental health conversations.

**Remember**: This is a mental health application where user safety and privacy are paramount. Every feature should be designed with care, empathy, and the highest security standards.