import { initAuth, contentDiv } from '../core'
import { renderAdminPanel } from '../admin-ui'

initAuth(async (user) => {
  if (user && user.isAdmin) {
    await renderAdminPanel()
    return
  }

  if (user) {
    contentDiv.innerHTML = `
      <div style="text-align: center; margin-top: 5rem;">
        <h1>Welcome, ${user.name || user.email}!</h1>
        <p>This is your personalized dashboard.</p>
        <div style="margin-top: 2rem;">
          <a href="/profiles" style="display: inline-block; padding: 1rem 2rem; background: #007bff; color: white; text-decoration: none; border-radius: 8px; font-size: 1.2rem;">View My Account Statistics</a>
        </div>
      </div>
    `
    return
  }

  contentDiv.innerHTML = `
    <div style="text-align: center; margin-top: 5rem;">
      <h1>Welcome to Kamaliia</h1>
      <p>Please <a href="/login" style="font-size: 1.5rem; color: #007bff;">Login</a> or <a href="/signup" style="font-size: 1.5rem; color: #28a745;">Sign Up</a> to continue.</p>
    </div>
  `
})
