const BASE_URL = '/api'

async function request(url, options = {}) {
  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`
    const text = await response.text()
    try {
      const errorData = JSON.parse(text)
      if (errorData && errorData.message) errorMessage = errorData.message
    } catch {
      if (text && text.length < 100) errorMessage = text
    }
    throw new Error(errorMessage)
  }
  if (response.status === 204) return undefined
  const text = await response.text()
  return text ? JSON.parse(text) : undefined
}

// Profiles
export const profilesApi = {
  getAll: () => request('/profiles'),
  getById: (id) => request(`/profiles/${id}`),
  getByEmail: (email) => request(`/profiles/by-email?email=${encodeURIComponent(email)}`),
  login: (credentials) => request('/profiles/login', { method: 'POST', body: JSON.stringify(credentials) }),
  create: (profile) => request('/profiles', { method: 'POST', body: JSON.stringify(profile) }),
  update: (id, profile) => request(`/profiles/${id}`, { method: 'PUT', body: JSON.stringify(profile) }),
  delete: (id) => request(`/profiles/${id}`, { method: 'DELETE' }),
}

// Account
export const accountApi = {
  create: (profile) => request('/account', { method: 'POST', body: JSON.stringify(profile) }),
  update: (id, profile) => request(`/account/${id}`, { method: 'PUT', body: JSON.stringify(profile) }),
  delete: (id) => request(`/account/${id}`, { method: 'DELETE' }),
}

// Events
export const eventsApi = {
  getAll: () => request('/events'),
  getById: (id) => request(`/events/${id}`),
  create: (event) => request('/events', { method: 'POST', body: JSON.stringify(event) }),
  update: (id, event) => request(`/events/${id}`, { method: 'PUT', body: JSON.stringify(event) }),
  delete: (id) => request(`/events/${id}`, { method: 'DELETE' }),
}

// Interests
export const interestsApi = {
  getAll: () => request('/interests'),
  getById: (id) => request(`/interests/${id}`),
  create: (interest) => request('/interests', { method: 'POST', body: JSON.stringify(interest) }),
  update: (id, interest) => request(`/interests/${id}`, { method: 'PUT', body: JSON.stringify(interest) }),
  delete: (id) => request(`/interests/${id}`, { method: 'DELETE' }),
  getAllUserInterests: () => request('/user-interests'),
  getUserInterests: (userId) => request(`/user-interests/${userId}`),
  addUserInterest: (userInterest) => request('/user-interests', { method: 'POST', body: JSON.stringify(userInterest) }),
  removeUserInterest: (userInterest) => request('/user-interests', { method: 'DELETE', body: JSON.stringify(userInterest) }),
}

// Locations
export const locationsApi = {
  getAll: () => request('/locations'),
  getById: (id) => request(`/locations/${id}`),
  create: (location) => request('/locations', { method: 'POST', body: JSON.stringify(location) }),
  update: (id, location) => request(`/locations/${id}`, { method: 'PUT', body: JSON.stringify(location) }),
  delete: (id) => request(`/locations/${id}`, { method: 'DELETE' }),
}

// Geopositions
export const geopositionsApi = {
  getAll: () => request('/geopositions'),
  getById: (id) => request(`/geopositions/${id}`),
  create: (geo) => request('/geopositions', { method: 'POST', body: JSON.stringify(geo) }),
  delete: (id) => request(`/geopositions/${id}`, { method: 'DELETE' }),
}

// Friends
export const friendsApi = {
  getAll: () => request('/friends'),
  getByUser: (userId) => request(`/friends/${userId}`),
  add: (relation) => request('/friends', { method: 'POST', body: JSON.stringify(relation) }),
  remove: (relation) => request('/friends', { method: 'DELETE', body: JSON.stringify(relation) }),
}

// Favourite Events
export const favouriteEventsApi = {
  getAll: () => request('/favourite-events'),
  getByUser: (userId) => request(`/favourite-events/${userId}`),
  add: (fav) => request('/favourite-events', { method: 'POST', body: JSON.stringify(fav) }),
  remove: (fav) => request('/favourite-events', { method: 'DELETE', body: JSON.stringify(fav) }),
}

// Favourite Locations
export const favouriteLocationsApi = {
  getAll: () => request('/favourite-locations'),
  getByUser: (userId) => request(`/favourite-locations/${userId}`),
  add: (fav) => request('/favourite-locations', { method: 'POST', body: JSON.stringify(fav) }),
  remove: (fav) => request('/favourite-locations', { method: 'DELETE', body: JSON.stringify(fav) }),
}
