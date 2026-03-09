import { initAuth, contentDiv, setSessionUser } from '../core'
import { accountApi } from '../api'

initAuth(async (user) => {
    if (user) {
    window.location.href = '/'
    return
  }
  renderSignup()
})

function renderSignup() {
  contentDiv.innerHTML = `
    <div style="max-width: 400px; margin: 2rem auto; padding: 1rem; border: 1px solid #ccc; border-radius: 8px;">
      <h2>Sign Up</h2>
      <form id="signup-form" style="display: flex; flex-direction: column; gap: 1rem;">
        <input type="text" id="signup-name" placeholder="Full Name" required style="padding: 0.5rem;" />
        <input type="number" id="signup-age" placeholder="Age" style="padding: 0.5rem;" />
        <select id="signup-gender" style="padding: 0.5rem;">
          <option value="false">Female</option>
          <option value="true">Male</option>
        </select>
        <input type="email" id="signup-email" placeholder="Email" required style="padding: 0.5rem;" />
        <input type="password" id="signup-password" placeholder="Password" required style="padding: 0.5rem;" />
        <button type="submit" style="padding: 0.5rem; cursor: pointer; background: #007bff; color: white; border: none; border-radius: 4px;">Sign Up</button>
      </form>
      <p style="margin-top: 1rem; text-align: center;">
        Already have an account? <a href="/login">Login</a>
      </p>
      <div id="signup-error" style="color: red; text-align: center; margin-top: 1rem;"></div>
    </div>
  `

  const form = document.getElementById('signup-form')
  const errorDiv = document.getElementById('signup-error')

  form.onsubmit = async (e) => {
    e.preventDefault()
    errorDiv.textContent = ''
    
    const name = document.getElementById('signup-name').value
    const age = parseInt(document.getElementById('signup-age').value) || null
    const gender = document.getElementById('signup-gender').value === 'true'
    const email = document.getElementById('signup-email').value
    const password = document.getElementById('signup-password').value

    try {
      const profile = await accountApi.create({ name, age, gender, email, password })
      
      // Store session and redirect
      setSessionUser(profile)
      window.location.href = '/'
    } catch (err) {
      errorDiv.textContent = err.message
    }
  }
}
