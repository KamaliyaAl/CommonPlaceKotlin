const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api';

export const api = {
  async getEvents(filters?: { query?: string; categories?: string[]; date?: string; minPrice?: string; maxPrice?: string; minStartTime?: string; organizerId?: string }) {
    let url = `${API_URL}/events`;
    if (filters) {
      const params = new URLSearchParams();
      if (filters.query) params.append('query', filters.query);
      if (filters.categories && filters.categories.length > 0 && !filters.categories.includes('all')) {
        params.append('category', filters.categories.join(','));
      }
      if (filters.date) params.append('date', filters.date);
      if (filters.minPrice) params.append('minPrice', filters.minPrice);
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
      if (filters.minStartTime) params.append('minStartTime', filters.minStartTime);
      if (filters.organizerId) params.append('organizerId', filters.organizerId);
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch events');
    const events = await response.json();
    
    // Fetch geopositions to get lat/lng
    const geoResponse = await fetch(`${API_URL}/geopositions`);
    const geopositions = geoResponse.ok ? await geoResponse.json() : [];
    const geoMap = new Map<string, any>(geopositions.map((g: any) => [g.id, g]));

    return events.map((e: any) => {
      const geo = geoMap.get(e.geopositionId);
      // Extract date part from startTime if it exists
      const datePart = e.startTime && e.startTime.includes('T') 
        ? e.startTime.split('T')[0] 
        : (e.startTime || new Date().toISOString().split('T')[0]);

      return {
        id: e.id,
        title: e.name || 'No title',
        description: e.description || '',
        lat: geo?.latitude || 0,
        lng: geo?.longitude || 0,
        category: e.category || 'other',
        date: datePart,
        startTime: e.startTime,
        endTime: e.endTime,
        rating: e.rating ?? undefined,
        reviewsCount: e.reviewsCount ?? undefined,
        price: e.price,
        imageUri: e.imageUri || null,
        organizerId: e.organizerId || null,
        geopositionId: e.geopositionId,
      };
    });
  },

  async addEvent(event: any) {
    // 1. Create Geoposition
    const geoResponse = await fetch(`${API_URL}/geopositions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude: event.lat,
        longitude: event.lng
      })
    });
    const geo = await geoResponse.json();

    // 2. Create Event
    const eventResponse = await fetch(`${API_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: event.title,
        description: event.description,
        geopositionId: geo.id,
        startTime: event.startTime,
        endTime: event.endTime,
        category: event.category,
        organizerId: event.organizerId || null,
        price: event.price,
        imageUri: event.imageUri
      })
    });
    const newEvent = await eventResponse.json();
    
    return {
      ...event,
      id: newEvent.id
    };
  },
  
  async updateEvent(id: string, event: any) {
    const response = await fetch(`${API_URL}/events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: event.title,
        description: event.description,
        startTime: event.startTime,
        endTime: event.endTime,
        category: event.category,
        price: event.price,
        imageUri: event.imageUri,
        organizerId: event.organizerId,
        geopositionId: event.geopositionId
      })
    });
    if (!response.ok) throw new Error('Failed to update event');
    return await response.json();
  },

  async deleteEvent(id: string) {
    const response = await fetch(`${API_URL}/events/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete event');
    return true;
  },

  async getProfiles() {
    const response = await fetch(`${API_URL}/profiles`);
    if (!response.ok) throw new Error('Failed to fetch profiles');
    return await response.json();
  },

  async getProfile(id: string) {
    const response = await fetch(`${API_URL}/profiles/${id}`);
    if (!response.ok) throw new Error('Failed to fetch profile');
    return await response.json();
  },

  async getFriends(userId: string) {
    const response = await fetch(`${API_URL}/friends/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch friends');
    return await response.json();
  },

  async addFriend(userId: string, friendId: string) {
    const response = await fetch(`${API_URL}/friends`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, friendId })
    });
    if (!response.ok) throw new Error('Failed to add friend');
    return await response.json();
  },

  async removeFriend(userId: string, friendId: string) {
    const response = await fetch(`${API_URL}/friends`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, friendId })
    });
    if (!response.ok) throw new Error('Failed to remove friend');
    return true;
  },
  
  async getFriendRequests(userId: string) {
    const response = await fetch(`${API_URL}/friend-requests/received/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch friend requests');
    return await response.json();
  },

  async getOutgoingFriendRequests(userId: string) {
    const response = await fetch(`${API_URL}/friend-requests/outgoing/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch outgoing friend requests');
    return await response.json();
  },

  async sendFriendRequest(fromUserId: string, toUserId: string) {
    const response = await fetch(`${API_URL}/friend-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromUserId, toUserId })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to send friend request');
    }
    return await response.json();
  },

  async acceptFriendRequest(requestId: string) {
    const response = await fetch(`${API_URL}/friend-requests/${requestId}/accept`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to accept friend request');
    return true;
  },

  async declineFriendRequest(requestId: string) {
    const response = await fetch(`${API_URL}/friend-requests/${requestId}/decline`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to decline friend request');
    return true;
  },
  
  async getInterests() {
    const response = await fetch(`${API_URL}/interests`);
    if (!response.ok) throw new Error('Failed to fetch interests');
    return await response.json();
  },

  async getUserInterests(userId: string) {
    const response = await fetch(`${API_URL}/user-interests/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch user interests');
    return await response.json();
  },

  async addUserInterest(userId: string, interestId: string) {
    const response = await fetch(`${API_URL}/user-interests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, interestId })
    });
    if (!response.ok) throw new Error('Failed to add user interest');
    return await response.json();
  },

  async removeUserInterest(userId: string, interestId: string) {
    const response = await fetch(`${API_URL}/user-interests`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, interestId })
    });
    if (!response.ok) throw new Error('Failed to remove user interest');
    return true;
  },

  async createInterest(interestName: string) {
    const response = await fetch(`${API_URL}/interests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interestName })
    });
    if (!response.ok) throw new Error('Failed to create interest');
    return await response.json();
  },

  // Favourite Events
  async getFavouriteEvents(userId: string) {
    const response = await fetch(`${API_URL}/favourites/events/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch favourite events');
    const events = await response.json();

    // Fetch geopositions to map lat/lng
    const geoResponse = await fetch(`${API_URL}/geopositions`);
    const geopositions = geoResponse.ok ? await geoResponse.json() : [];
    const geoMap = new Map<string, any>(geopositions.map((g: any) => [g.id, g]));

    return events.map((e: any) => {
      const geo = geoMap.get(e.geopositionId);
      const datePart = e.startTime && e.startTime.includes('T')
        ? e.startTime.split('T')[0]
        : (e.startTime || new Date().toISOString().split('T')[0]);

      return {
        id: e.id,
        title: e.name || 'No title',
        description: e.description || '',
        lat: geo?.latitude || 0,
        lng: geo?.longitude || 0,
        category: e.category || 'other',
        date: datePart,
        startTime: e.startTime,
        endTime: e.endTime,
        rating: e.rating ?? undefined,
        reviewsCount: e.reviewsCount ?? undefined,
        price: e.price,
        imageUri: e.imageUri || null,
        organizerId: e.organizerId || null,
        geopositionId: e.geopositionId,
      };
    });
  },

  async addFavouriteEvent(userId: string, eventId: string) {
    const response = await fetch(`${API_URL}/favourites/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, eventId })
    });
    if (!response.ok) throw new Error('Failed to add favourite event');
    return await response.json();
  },

  async removeFavouriteEvent(userId: string, eventId: string) {
    const response = await fetch(`${API_URL}/favourites/events`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, eventId })
    });
    if (!response.ok) throw new Error('Failed to remove favourite event');
    return true;
  },

  // Place Entries
  async getPlaceEntries() {
    const response = await fetch(`${API_URL}/place-entries`);
    if (!response.ok) throw new Error('Failed to fetch place entries');
    return await response.json();
  },

  async addPlaceEntry(place: Omit<import('./types').PlaceEntry, 'id'>) {
    const response = await fetch(`${API_URL}/place-entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(place)
    });
    if (!response.ok) throw new Error('Failed to create place entry');
    return await response.json();
  },

  async getReviews(eventId: string, sortBy: 'rating' | 'date' = 'date'): Promise<import('./types').Review[]> {
    const response = await fetch(`${API_URL}/reviews/${eventId}?sortBy=${sortBy}`);
    if (!response.ok) throw new Error('Failed to fetch reviews');
    return await response.json();
  },

  async submitReview(review: {
    eventId: string;
    userId: string;
    userName: string;
    rating: number;
    reviewText: string;
    adviceText?: string;
  }): Promise<import('./types').Review> {
    const response = await fetch(`${API_URL}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(review),
    });
    if (!response.ok) throw new Error('Failed to submit review');
    return await response.json();
  },

  // Registrations (Join/Unjoin)
  async joinEvent(userId: string, eventId: string): Promise<import('./types').EventRegistration | null> {
    const response = await fetch(`${API_URL}/registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, eventId }),
    });
    if (response.status === 409) return null; // already joined
    if (!response.ok) throw new Error('Failed to join event');
    return await response.json();
  },

  async unjoinEvent(userId: string, eventId: string): Promise<void> {
    const response = await fetch(`${API_URL}/registrations`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, eventId }),
    });
    if (!response.ok) throw new Error('Failed to unjoin event');
  },

  async getRegistrations(userId: string): Promise<import('./types').EventRegistration[]> {
    const response = await fetch(`${API_URL}/registrations/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch registrations');
    return await response.json();
  },

  // Notifications
  async getNotifications(userId: string): Promise<import('./types').AppNotification[]> {
    const response = await fetch(`${API_URL}/notifications/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch notifications');
    return await response.json();
  },

  async markNotificationRead(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/notifications/${id}/read`, {
      method: 'PUT',
    });
    if (!response.ok) throw new Error('Failed to mark notification as read');
  },

  async markAllNotificationsRead(userId: string): Promise<void> {
    const response = await fetch(`${API_URL}/notifications/read-all/${userId}`, {
      method: 'PUT',
    });
    if (!response.ok) throw new Error('Failed to mark all notifications as read');
  },
};
