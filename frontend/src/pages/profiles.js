import { profilesApi, interestsApi, friendsApi, favouriteEventsApi, favouriteLocationsApi, accountApi } from '../api'
import { initAuth, contentDiv, setSessionUser } from '../core'

initAuth(async (user) => {
  if (user) {
    const urlParams = new URLSearchParams(window.location.search);
    const profileId = urlParams.get('id');
    
    if (profileId) {
      await renderUserProfileById(user, profileId)
    } else {
      await renderUserProfile(user)
    }
  } else {
    window.location.href = '/login'
  }
})

async function renderUserProfileById(currentUser, profileId) {
  try {
    const profile = await profilesApi.getById(profileId)
    const canEdit = currentUser.isAdmin || profile.id === currentUser.id
    await renderProfileData(currentUser, profile, canEdit)
  } catch (err) {
    contentDiv.innerHTML = `<p style="color: red;">Error: ${err.message}</p>`
  }
}

async function renderUserProfile(user) {
  try {
    const profile = await profilesApi.getByEmail(user.email)
    await renderProfileData(user, profile, true) // Own profile is always editable
  } catch (err) {
    contentDiv.innerHTML = `<p style="color: red;">Error: ${err.message}</p>`
  }
}

async function renderProfileData(currentUser, profile, canEdit) {
  try {
    const interests = await interestsApi.getUserInterests(profile.id)
    const friends = await friendsApi.getByUser(profile.id)
    const favEvents = await favouriteEventsApi.getByUser(profile.id)
    const favLocations = await favouriteLocationsApi.getByUser(profile.id)
    // profile.id - целевой профиль. currentUser.id - мой ID.
    // friends - список друзей целевого профиля. Если я там есть - мы друзья.
    const isFriend = friends.some(f => f.id === currentUser.id)

    let html = `
      <div style="max-width: 800px; margin: 0 auto; padding: 1rem;">
        <div style="background: #f8f9fa; padding: 2rem; border-radius: 8px; border: 1px solid #dee2e6; margin-bottom: 2rem;">
          <h2 style="margin-top: 0;">${canEdit ? 'My Profile Statistics' : profile.name + "'s Profile"}</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
            <div><strong>Name:</strong> ${profile.name}</div>
            <div><strong>Age:</strong> ${profile.age ?? '-'}</div>
            <div><strong>Gender:</strong> ${profile.gender ? 'Female' : 'Male'}</div>
            <div><strong>Email:</strong> ${profile.email}</div>
          </div>
          <div style="margin-top: 1.5rem; text-align: right; display: flex; justify-content: flex-end; gap: 1rem;">
            ${canEdit ? `
              <button id="edit-account-btn" style="padding: 0.5rem 1rem; cursor: pointer; background: #007bff; color: white; border: none; border-radius: 4px;">Edit Profile</button>
              <button id="delete-account-btn" style="padding: 0.5rem 1rem; cursor: pointer; background: #6c757d; color: white; border: none; border-radius: 4px;">Delete Account</button>
              <button id="logout-btn" style="padding: 0.5rem 1rem; cursor: pointer; background: #dc3545; color: white; border: none; border-radius: 4px;">Logout</button>
            ` : `
              <button id="friend-btn" style="padding: 0.5rem 1rem; cursor: pointer; background: ${isFriend ? '#6c757d' : '#28a745'}; color: white; border: none; border-radius: 4px;">
                ${isFriend ? 'Remove friend' : 'Add Friend'}
              </button>
            `}
          </div>
        </div>

        ${canEdit ? `
        <div id="edit-profile-form-container" style="display: none; background: #fff; padding: 1.5rem; border-radius: 8px; border: 1px solid #dee2e6; margin-bottom: 2rem;">
          <h3>Edit Profile</h3>
          <form id="edit-profile-form" style="display: flex; flex-direction: column; gap: 1rem;">
            <input type="text" id="edit-name" value="${profile.name}" required style="padding: 0.5rem;" />
            <input type="number" id="edit-age" value="${profile.age ?? ''}" style="padding: 0.5rem;" />
            <select id="edit-gender" style="padding: 0.5rem;">
              <option value="false" ${!profile.gender ? 'selected' : ''}>Male</option>
              <option value="true" ${profile.gender ? 'selected' : ''}>Female</option>
            </select>
            <input type="password" id="edit-password" value="${profile.password}" placeholder="New Password" required style="padding: 0.5rem;" />
            <div style="display: flex; gap: 1rem;">
              <button type="submit" style="padding: 0.5rem 1rem; cursor: pointer; background: #28a745; color: white; border: none; border-radius: 4px; flex: 1;">Save Changes</button>
              <button type="button" id="cancel-edit-btn" style="padding: 0.5rem 1rem; cursor: pointer; background: #6c757d; color: white; border: none; border-radius: 4px; flex: 1;">Cancel</button>
            </div>
          </form>
        </div>
        ` : ''}

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
          <section>
            <h3>${canEdit ? 'My ' : ''}Interests (${interests.length})</h3>
            <ul id="user-interests-list">
              ${interests.length ? interests.map(i => `<li>${i.interestId}</li>`).join('') : '<li>No interests added</li>'}
            </ul>
          </section>

          <section>
            <h3>${canEdit ? 'My ' : ''}Friends (${friends.length})</h3>
            <ul id="user-friends-list">
              ${friends.length ? friends.map(f => `<li><a href="/profiles?id=${f.id}">${f.name || f.id}</a></li>`).join('') : '<li>No friends added</li>'}
            </ul>
          </section>

          <section>
            <h3>${canEdit ? 'My ' : ''}Favourite Events (${favEvents.length})</h3>
            <ul id="user-events-list">
              ${favEvents.length ? favEvents.map(e => `<li>${e.eventId}</li>`).join('') : '<li>No favourite events</li>'}
            </ul>
          </section>

          <section>
            <h3>${canEdit ? 'My ' : ''}Favourite Locations (${favLocations.length})</h3>
            <ul id="user-locations-list">
              ${favLocations.length ? favLocations.map(l => `<li>${l.locationId}</li>`).join('') : '<li>No favourite locations</li>'}
            </ul>
          </section>
        </div>
    `

    html += `</div>`
    contentDiv.innerHTML = html

    if (canEdit) {
      document.getElementById('logout-btn').onclick = () => {
        setSessionUser(null)
        window.location.href = '/login'
      }

      const editFormContainer = document.getElementById('edit-profile-form-container')
      document.getElementById('edit-account-btn').onclick = () => {
        editFormContainer.style.display = editFormContainer.style.display === 'none' ? 'block' : 'none'
      }
      document.getElementById('cancel-edit-btn').onclick = () => {
        editFormContainer.style.display = 'none'
      }

      document.getElementById('edit-profile-form').onsubmit = async (e) => {
        e.preventDefault()
        const name = document.getElementById('edit-name').value
        const age = parseInt(document.getElementById('edit-age').value) || null
        const gender = document.getElementById('edit-gender').value === 'true'
        const password = document.getElementById('edit-password').value

        try {
          const updated = await accountApi.update(profile.id, {
            ...profile,
            name, age, gender, password
          })
          if (profile.id === currentUser.id) {
            setSessionUser(updated)
          }
          window.location.reload()
        } catch (err) {
          alert('Failed to update account: ' + err.message)
        }
      }

      document.getElementById('delete-account-btn').onclick = async () => {
        if (confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
          try {
            await accountApi.delete(profile.id)
            if (profile.id === currentUser.id) {
              setSessionUser(null)
              window.location.href = '/login'
            } else {
              window.location.href = '/users'
            }
          } catch (err) {
            alert('Failed to delete account: ' + err.message)
          }
        }
      }
    } else {
      document.getElementById('friend-btn').onclick = async () => {
        try {
          if (isFriend) {
            await friendsApi.remove({ userId: currentUser.id, friendId: profile.id })
          } else {
            await friendsApi.add({ userId: currentUser.id, friendId: profile.id })
          }
          window.location.reload()
        } catch (err) {
          alert('Failed to update friendship: ' + err.message)
        }
      }
    }

  } catch (err) {
    contentDiv.innerHTML = `<p style="color: red;">Error: ${err.message}</p>`
  }
}
