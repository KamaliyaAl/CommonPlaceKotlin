### CommonPlace

A multiplatform application with a **Kotlin/Ktor** backend and a **React Native / Expo** mobile frontend, using **Firebase Firestore** as the database.

### Project Structure

```text
CommonPlace/
├── src/main/kotlin/org/example/                  # Kotlin backend
│   ├── Application.kt                            # Ktor server entry point (port 8080)
│   ├── firebase/FirebaseService.kt               # Firebase initialization
│   ├── models/Models.kt                          # Data models
│   └── routes/                                   # REST API routes
│       ├── ProfileRoutes.kt
│       ├── EventRoutes.kt
│       ├── InterestRoutes.kt
│       ├── LocationRoutes.kt
│       └── FriendRoutes.kt
├── mobile-frontend/                              # Expo mobile frontend
│   ├── .env.local                                # Mobile frontend API URL
│   └── ...
├── .env.local                                    # Backend/frontend Firebase config
├── commonplace1-firebase-adminsdk-fbsvc-fa57a72c94.json
└── build.gradle.kts                              # Gradle build config
```

### Prerequisites

- **JDK 21+**
- **Node.js 18+** and npm
- **Firebase** project with Firestore enabled

### Setup

#### 1. Create `.env.local` in the project root

Paste the following into `.env.local`:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
FIREBASE_SERVICE_ACCOUNT_PATH=commonplace1-firebase-adminsdk-fbsvc-fa57a72c94.json
```

#### 2. Create `commonplace1-firebase-adminsdk-fbsvc-fa57a72c94.json` in the project root

Paste the following JSON into the file:

```json
{
  "type": "service_account",
  "project_id": "...",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "...",
  "client_id": "...",
  "auth_uri": "...",
  "token_uri": "...",
  "auth_provider_x509_cert_url": "...",
  "client_x509_cert_url": "...",
  "universe_domain": "..."
}
```

#### 3. Configure the mobile frontend API URL

Find your local IP address:

```bash
ipconfig getifaddr en0
```

Then create or update `mobile-frontend/.env.local` with:

```env
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:8080/api
```

### How to Run

#### Backend

Open the first terminal in the project root and run:

```bash
./gradlew run
```

If the mobile frontend cannot connect, run the backend with an explicit bind address instead:

```bash
./gradlew run --args='--server.address=0.0.0.0'
```

#### Mobile frontend

Open the second terminal:

```bash
cd mobile-frontend
npm install
npx expo start
```

`npm install` is only needed during the initial setup or after dependency changes.

### API Endpoints

| Resource             | Method   | Endpoint                             |
|----------------------|----------|--------------------------------------|
| Profiles             | GET/POST | `/api/profiles`                      |
| Profile by ID        | GET/PUT/DELETE | `/api/profiles/{id}`           |
| Events               | GET/POST | `/api/events`                        |
| Event by ID          | GET/PUT/DELETE | `/api/events/{id}`             |
| Interests            | GET/POST | `/api/interests`                     |
| Interest by ID       | GET/DELETE | `/api/interests/{id}`              |
| Locations            | GET/POST | `/api/locations`                     |
| Location by ID       | GET/PUT/DELETE | `/api/locations/{id}`          |
| Geopositions         | GET/POST | `/api/geopositions`                  |
| Geoposition by ID    | GET/DELETE | `/api/geopositions/{id}`           |
| User's Friends       | GET      | `/api/friends/{userId}`              |
| Friends              | POST/DELETE | `/api/friends`                    |
| User Interests       | GET      | `/api/user-interests/{userId}`       |
| User Interests       | POST/DELETE | `/api/user-interests`             |
| Favourite Events     | GET      | `/api/favourite-events/{userId}`     |
| Favourite Events     | POST/DELETE | `/api/favourite-events`           |
| Favourite Locations  | GET      | `/api/favourite-locations/{userId}`  |
| Favourite Locations  | POST/DELETE | `/api/favourite-locations`        |

### Database Schema

The application models the following Firestore collections mapped from the relational schema:

- **profiles** — User profiles (name, age, gender, email)
- **events** — Events with geoposition and organizer references
- **interests** — Available interests
- **user_interests** — Many-to-many: users ↔ interests
- **locations** — Locations with geoposition references
- **geopositions** — Geographic coordinates (latitude, longitude)
- **friends_relations** — Many-to-many: user ↔ friend
- **favourite_events** — Many-to-many: user ↔ favourite event
- **favourite_locations** — Many-to-many: user ↔ favourite location
