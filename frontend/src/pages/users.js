import { profilesApi } from '../api'
import { initAuth, contentDiv } from '../core'

initAuth(async (user) => {
  if (!user) {
    window.location.href = '/login'
    return
  }

  try {
    const allProfiles = await profilesApi.getAll()
    const profiles = allProfiles.filter(p => p.id !== user.id && !p.isAdmin)
    
    let html = `
      <div style="max-width: 800px; margin: 0 auto; padding: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
          <h1 style="margin: 0;">All Users</h1>
          <div style="position: relative; width: 300px;">
            <input type="text" id="user-search-input" placeholder="Search by name or email..." 
              style="width: 100%; padding: 0.6rem 1rem; border: 1px solid #ced4da; border-radius: 20px; outline: none; transition: border-color 0.2s;">
          </div>
        </div>
        <div id="users-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1.5rem;">
    `

    function renderProfiles(filteredProfiles) {
      let gridHtml = ''
      filteredProfiles.forEach(p => {
        gridHtml += `
          <div class="user-card" style="border: 1px solid #dee2e6; border-radius: 12px; padding: 1.5rem; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.05); transition: transform 0.2s, box-shadow 0.2s;">
            <h3 style="margin: 0 0 0.5rem 0; color: #333;">${p.name || 'No Name'}</h3>
            <p style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">Email: ${p.email}</p>
            <p style="margin: 0 0 1rem 0; color: #666; font-size: 0.9rem;">Age: ${p.age ?? '-'}</p>
            <a href="/profiles?id=${p.id}" style="display: block; text-align: center; padding: 0.6rem; background: #007bff; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; transition: background 0.2s;">View Profile</a>
          </div>
        `
      })

      if (filteredProfiles.length === 0) {
        gridHtml = '<p style="grid-column: 1/-1; text-align: center; color: #666; padding: 2rem;">No users found.</p>'
      }
      return gridHtml
    }

    html += renderProfiles(profiles)
    html += `
        </div>
      </div>
    `
    contentDiv.innerHTML = html

    const searchInput = document.getElementById('user-search-input')
    const usersGrid = document.getElementById('users-grid')

    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase()
      const filtered = profiles.filter(p => 
        (p.name && p.name.toLowerCase().includes(searchTerm)) || 
        (p.email && p.email.toLowerCase().includes(searchTerm))
      )
      usersGrid.innerHTML = renderProfiles(filtered)
    })

  } catch (err) {
    contentDiv.innerHTML = `<p style="color: red;">Error: ${err.message}</p>`
  }
})
