import './style.css'

export function getSessionUser() {
  const user = localStorage.getItem('user')
  return user ? JSON.parse(user) : null
}

export function setSessionUser(user) {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user))
  } else {
    localStorage.removeItem('user')
  }
}

export function initAuth(callback) {
  const userStatusDiv = document.getElementById('user-status')
  const loginLink = document.getElementById('login-link')
  const signupLink = document.getElementById('signup-link')
  const mainNav = document.getElementById('main-nav')

  const user = getSessionUser()

  if (user) {
    if (userStatusDiv) userStatusDiv.innerHTML = `Logged in as: <strong>${user.email}</strong>`
    
    // Add Users link if it doesn't exist
    if (mainNav && !document.getElementById('users-link')) {
      const usersLink = document.createElement('a')
      usersLink.href = '/users'
      usersLink.id = 'users-link'
      usersLink.textContent = 'Users'
      mainNav.insertBefore(usersLink, loginLink)
    }

    if (loginLink) {
      loginLink.textContent = 'Account'
      loginLink.href = '/profiles'
    }
    if (signupLink) signupLink.style.display = 'none'
  } else {
    if (userStatusDiv) userStatusDiv.textContent = 'Not logged in'
    if (loginLink) {
      loginLink.textContent = 'Login'
      loginLink.href = '/login'
    }
    if (signupLink) signupLink.style.display = 'inline'
  }

  // Role-based navigation visibility
  if (mainNav) {
    const adminLinks = mainNav.querySelectorAll('a[href="/events"], a[href="/interests"], a[href="/locations"], a[href="/debug"]')
    adminLinks.forEach(link => link.style.display = 'none')

    if (user && user.isAdmin && !document.getElementById('admin-link')) {
      const adminLink = document.createElement('a')
      adminLink.href = '/admin'
      adminLink.id = 'admin-link'
      adminLink.textContent = 'Admin Panel'
      adminLink.style.fontWeight = 'bold'
      mainNav.insertBefore(adminLink, loginLink)
    }
  }

  if (import.meta.env.DEV && mainNav && !document.getElementById('debug-link')) {
    const debugLink = document.createElement('a')
    debugLink.href = '/debug'
    debugLink.id = 'debug-link'
    debugLink.textContent = 'DEBUG'
    debugLink.style.fontWeight = 'bold'
    debugLink.style.color = 'red'
    mainNav.appendChild(debugLink)
  }

  if (callback) callback(user)
}

export const contentDiv = document.getElementById('content')
