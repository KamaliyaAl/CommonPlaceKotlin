import { initAuth, contentDiv, setSessionUser } from '../core'
import { profilesApi } from '../api'

initAuth(async (user) => {
  await renderLogin(user)
})

async function renderLogin(currentUser) {
  if (currentUser) {
    contentDiv.innerHTML = `
      <div style="max-width: 400px; margin: 2rem auto; padding: 1rem; border: 1px solid #ccc; border-radius: 8px;">
        <h2>Welcome, ${currentUser.name || currentUser.email}</h2>
        <p>You are currently logged in.</p>
        <div style="display: flex; gap: 1rem;">
          <button id="profile-btn" style="padding: 0.5rem; cursor: pointer; flex: 1;">View My Profile</button>
          <button id="logout-btn" style="padding: 0.5rem; cursor: pointer; flex: 1;">Logout</button>
        </div>
      </div>
    `
    document.getElementById('logout-btn').onclick = () => {
      setSessionUser(null)
      window.location.reload()
    }
    document.getElementById('profile-btn').onclick = () => {
      window.location.href = '/profiles'
    }
    return
  }

  contentDiv.innerHTML = `
    <div style="max-width: 400px; margin: 2rem auto; padding: 1rem; border: 1px solid #ccc; border-radius: 8px;">
      <h2 id="auth-title">Login</h2>
      <form id="auth-form" style="display: flex; flex-direction: column; gap: 1rem;">
        <input type="email" id="auth-email" placeholder="Email" required style="padding: 0.5rem;" />
        <input type="password" id="auth-password" placeholder="Password" required style="padding: 0.5rem;" />
        <button type="submit" id="auth-submit" style="padding: 0.5rem; cursor: pointer; background: #28a745; color: white; border: none; border-radius: 4px;">Login</button>
      </form>
      <p style="margin-top: 1rem; text-align: center;">
        Don't have an account? <a href="/signup" style="color: blue; text-decoration: underline;">Sign Up</a>
      </p>
      <div id="auth-error" style="color: red; text-align: center; margin-top: 1rem;"></div>
    </div>
  `

  const form = document.getElementById('auth-form')
  const errorDiv = document.getElementById('auth-error')

  form.onsubmit = async (e) => {
    e.preventDefault()
    errorDiv.textContent = ''
    const email = document.getElementById('auth-email').value
    const password = document.getElementById('auth-password').value
    try {
      // Backend validation
      const profile = await profilesApi.login({ email, password })
      
      // Store session
      setSessionUser(profile)

      window.location.href = '/'
    } catch (err) {
      errorDiv.textContent = err.message
    }
  }
}
