# Project Overview

## Introduction

This project is a **multiplatform event discovery application for Cyprus** that helps users find, explore, and manage local events through an interactive map-based interface. The platform enables users to discover nearby events, filter them by time and interests, save favorites, and interact with other users.

The system is built using a **modern full-stack architecture**:

- **Backend:** Kotlin with Ktor
- **Frontend:** React with TypeScript
- **Database:** Firebase Firestore
- **Platform:** Mobile and Web compatible interface

The application focuses on **location-based event discovery**, allowing users to browse events visually on a map while also viewing them in list format.

---

## System Architecture

The project follows a **client-server architecture**:

Frontend (React + TypeScript)
│
│ REST API
▼
Backend (Kotlin + Ktor)
│
│ Firebase SDK
▼
Firebase Firestore

### Backend (Kotlin + Ktor)

The backend is implemented using **Ktor**, a lightweight asynchronous framework for building APIs in Kotlin.

Responsibilities include:

- User authentication
- Event management
- Location queries
- Favorites management
- User profiles and interests
- Friend relationships
- Communication with Firebase Firestore

The backend exposes **REST endpoints** that the frontend consumes.

---

### Frontend (React + TypeScript)

The frontend provides a **responsive user interface** that allows users to interact with the platform.

Key UI technologies:

- **React**
- **TypeScript**
- **Map-based visualization**
- **Mobile-first UI design**

The interface focuses on **event exploration and filtering**, integrating maps, lists, and personalized recommendations.

---

### Database (Firebase Firestore)

The application uses **Firebase Firestore** as its primary data store.

Firestore was chosen for:

- Real-time data updates
- Scalability
- Easy integration with mobile applications
- Flexible document-based structure

The database stores information about:

- Users
- Events
- Locations
- Interests
- Friend relationships
- Favorite events and locations

---

## Core Features

### 1. Event Discovery

Users can explore events through:

- **Map view**
- **Event list**
- **Search functionality**
- **Date filters**

Events are displayed as markers on the map, allowing users to visually identify nearby activities.

---

### 2. Event Filters

Users can refine their event search using filters such as:

- Date
- Interests
- Location
- Categories

Filters allow users to quickly find relevant events happening around them.

---

### 3. Favorites

Users can save:

- Favorite events
- Favorite locations

This allows quick access to preferred activities and places.

---

### 4. User Profiles

Each user has a profile containing:

- Name
- Email
- Age
- Gender
- City
- Interests

Users can edit their interests and personalize their experience.

---

### 5. Interests System

Users can select interests such as:

- Sports
- Reading
- Swimming
- Dancing
- Running

These interests help personalize event discovery.

---

### 6. Social Features

Users can connect with friends within the platform.

The system supports:

- Friend relationships
- Viewing friends on profiles
- Event sharing

---

## Application Screens

The application consists of several main screens:

### Authentication

Users can sign in or sign up using email credentials.

Features:

- Email/password login
- Google authentication
- User session management

---

### Map View

The **map screen** is the main discovery interface.

Features include:

- Event markers on a map
- Date selector
- Filters
- Event preview cards
- Route navigation to event locations

---

### Event List

Events can also be viewed in a **scrollable list**.

Each event displays:

- Event name
- Description
- Rating
- Map visibility
- Favorite option

---

### User Profile

Users can manage their profile information:

- Profile picture
- Interests
- Friend list
- Personal information
- Account settings

---

### Dashboard

The dashboard provides quick access to:

- Find events
- My events
- Favorites
- History

---

## Database Design

The database includes several key entities.

### Users

Stores profile data for each user.

Fields include:

- id
- name
- gender
- email

---

### Events

Stores event details.

Fields include:

- id
- name
- description
- geolocation
- organizer
- time

---

### Locations

Stores event locations.

Fields include:

- id
- geoposition
- description

---

### Interests

Defines available interests for users.

Fields include:

- id
- interest_name

---

### User Interests

Links users to their interests.

Fields include:

- user_id
- interest_id

---

### Favorites

Users can save events and locations.

Tables include:

- `is_favourite_event`
- `is_favourite_location`

---

### Friend Relationships

Stores connections between users.

Fields include:

- user_id
- friend_id

---

## Map Integration

Map functionality allows users to:

- View nearby events
- Navigate to locations
- Filter events by area

Each event contains **geospatial coordinates** used to render markers on the map.

---

## Scalability Considerations

The system is designed to scale using:

- Firebase Firestore distributed storage
- Stateless Ktor backend services
- Modular frontend architecture

Future improvements may include:

- real-time event updates
- push notifications
- recommendation systems
- event hosting tools

---

## Conclusion

This platform aims to simplify **event discovery in Cyprus** by combining:

- location-based services
- personalized interests
- social features
- modern cross-platform architecture

The combination of **Kotlin/Ktor backend, React/TypeScript frontend, and Firebase Firestore** provides a scalable and flexible foundation for expanding the platform in the future.
