### CommonPlace

A multiplatform application with a **Kotlin/Ktor** backend and a **React/TypeScript** frontend, using **Firebase Firestore** as the database.

### Project Structure

```
CommonPlace/
├── src/main/kotlin/org/example/   # Kotlin backend
│   ├── Application.kt             # Ktor server entry point (port 8080)
│   ├── firebase/FirebaseService.kt # Firebase initialization
│   ├── models/Models.kt           # Data models
│   └── routes/                    # REST API routes
│       ├── ProfileRoutes.kt
│       ├── EventRoutes.kt
│       ├── InterestRoutes.kt
│       ├── LocationRoutes.kt
│       └── FriendRoutes.kt
├── frontend/                      # React frontend
│   ├── src/
│   │   ├── main.tsx               # React entry point
│   │   ├── App.tsx                # App with routing
│   │   ├── api.ts                 # API client
│   │   ├── types.ts               # TypeScript interfaces
│   │   ├── firebase.ts            # Firebase client config
│   │   └── components/            # UI components
│   ├── package.json
│   └── vite.config.ts             # Vite dev server (port 3000, proxies /api to 8080)
├── _env.local                     # Firebase credentials
└── build.gradle.kts               # Gradle build config
```

### Troubleshooting: Permission Denied

If you see a `PERMISSION_DENIED` error in your logs, it means the identity (service account or personal account) used by the backend does not have sufficient permissions to access Firestore in your project.

**1. Identify the Current Identity**
Check your application logs for a line starting with:
`[main] INFO org.example.firebase.FirebaseService - Firebase Identity: ...`

- If it's a **service account email** (e.g., `my-service-account@...`), follow the steps below for Service Accounts.
- If it's `UserCredentials`, it means you are using your personal account (likely via `gcloud auth application-default login`).

**2. Grant Permissions (Google Cloud Console)**
1.  Go to the [IAM & Admin](https://console.cloud.google.com/iam-admin/iam) page in the Google Cloud Console.
2.  Select your project: **commonplace1** (or the one in your `.env.local`).
3.  Click **GRANT ACCESS** (or edit the existing entry for your identity).
4.  In the **New principals** field, enter the identity from your logs.
5.  In the **Select a role** field, add the following roles:
    - `Cloud Datastore User` (required for Firestore access)
    - `Firebase Firestore Admin` (if you need more extensive access)
6.  Click **SAVE**.

**3. If using the Emulator**
Ensure `FIRESTORE_EMULATOR_HOST` is correctly set in `.env.local`. The emulator does not require real credentials or permissions.

---

### Prerequisites

- **JDK 21+**
- **Node.js 18+** and npm
- **Firebase** project with Firestore enabled
- **Google Application Default Credentials** for the backend:
  ```bash
  export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"
  ```

### Backend Setup

```bash
# Run the Ktor server (starts on port 8080)
./gradlew run
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev    # Starts Vite dev server on port 3000
```

### API Endpoints

| Resource             | Method   | Endpoint                        |
|----------------------|----------|---------------------------------|
| Profiles             | GET/POST | `/api/profiles`                 |
| Profile by ID        | GET/PUT/DELETE | `/api/profiles/{id}`      |
| Events               | GET/POST | `/api/events`                   |
| Event by ID          | GET/PUT/DELETE | `/api/events/{id}`        |
| Interests            | GET/POST | `/api/interests`                |
| Interest by ID       | GET/DELETE | `/api/interests/{id}`         |
| Locations            | GET/POST | `/api/locations`                |
| Location by ID       | GET/PUT/DELETE | `/api/locations/{id}`     |
| Geopositions         | GET/POST | `/api/geopositions`             |
| Geoposition by ID    | GET/DELETE | `/api/geopositions/{id}`      |
| User's Friends       | GET      | `/api/friends/{userId}`         |
| Friends              | POST/DELETE | `/api/friends`               |
| User Interests       | GET      | `/api/user-interests/{userId}`  |
| User Interests       | POST/DELETE | `/api/user-interests`        |
| Favourite Events     | GET      | `/api/favourite-events/{userId}`|
| Favourite Events     | POST/DELETE | `/api/favourite-events`      |
| Favourite Locations  | GET      | `/api/favourite-locations/{userId}` |
| Favourite Locations  | POST/DELETE | `/api/favourite-locations`   |

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
