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
  let step = 1
  let signupData = {
    email: '',
    password: '',
    name: '',
    age: null,
    gender: false
  }

  function renderStep() {
    if (step === 1) {
      contentDiv.innerHTML = `
        <div style="max-width: 400px; margin: 2rem auto; padding: 1rem; border: 1px solid #ccc; border-radius: 8px;">
          <h2>Sign Up - Step 1</h2>
          <form id="signup-form-1" style="display: flex; flex-direction: column; gap: 1rem;">
            <input type="email" id="signup-email" placeholder="Email" required value="${signupData.email}" style="padding: 0.5rem;" />
            <input type="password" id="signup-password" placeholder="Password" required value="${signupData.password}" style="padding: 0.5rem;" />
            <button type="submit" style="padding: 0.5rem; cursor: pointer; background: #007bff; color: white; border: none; border-radius: 4px;">Next</button>
          </form>
          <p style="margin-top: 1rem; text-align: center;">
            Already have an account? <a href="/login">Login</a>
          </p>
          <div id="signup-error" style="color: red; text-align: center; margin-top: 1rem;"></div>
        </div>
      `
      const form = document.getElementById('signup-form-1')
      form.onsubmit = (e) => {
        e.preventDefault()
        signupData.email = document.getElementById('signup-email').value
        signupData.password = document.getElementById('signup-password').value
        step = 2
        renderStep()
      }
    } else {
      contentDiv.innerHTML = `
        <div style="max-width: 400px; margin: 2rem auto; padding: 1rem; border: 1px solid #ccc; border-radius: 8px;">
          <h2>Sign Up - Step 2</h2>
          <form id="signup-form-2" style="display: flex; flex-direction: column; gap: 1rem;">
            <input type="text" id="signup-name" placeholder="Full Name" required value="${signupData.name}" style="padding: 0.5rem;" />
            <input type="number" id="signup-age" placeholder="Age" value="${signupData.age || ''}" style="padding: 0.5rem;" />
            <select id="signup-gender" style="padding: 0.5rem;">
              <option value="false" ${!signupData.gender ? 'selected' : ''}>Male</option>
              <option value="true" ${signupData.gender ? 'selected' : ''}>Female</option>
            </select>
            <div style="display: flex; gap: 0.5rem;">
              <button type="button" id="prev-step" style="padding: 0.5rem; cursor: pointer; flex: 1; background: #6c757d; color: white; border: none; border-radius: 4px;">Back</button>
              <button type="submit" style="padding: 0.5rem; cursor: pointer; flex: 2; background: #28a745; color: white; border: none; border-radius: 4px;">Complete Registration</button>
            </div>
          </form>
          <div id="signup-error" style="color: red; text-align: center; margin-top: 1rem;"></div>
        </div>
      `
      const form = document.getElementById('signup-form-2')
      const errorDiv = document.getElementById('signup-error')

      document.getElementById('prev-step').onclick = () => {
        signupData.name = document.getElementById('signup-name').value
        signupData.age = parseInt(document.getElementById('signup-age').value) || null
        signupData.gender = document.getElementById('signup-gender').value === 'true'
        step = 1
        renderStep()
      }

      form.onsubmit = async (e) => {
        e.preventDefault()
        errorDiv.textContent = ''
        
        signupData.name = document.getElementById('signup-name').value
        signupData.age = parseInt(document.getElementById('signup-age').value) || null
        signupData.gender = document.getElementById('signup-gender').value === 'true'

        try {
          const profile = await accountApi.create(signupData)
          setSessionUser(profile)
          window.location.href = '/'
        } catch (err) {
          errorDiv.textContent = err.message
        }
      }
    }
  }

  renderStep()
}
