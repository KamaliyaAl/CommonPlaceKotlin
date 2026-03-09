import { 
  profilesApi, eventsApi, interestsApi, locationsApi, geopositionsApi, friendsApi, 
  favouriteEventsApi, favouriteLocationsApi 
} from './api'
import { contentDiv } from './core'

export async function renderAdminPanel() {
  contentDiv.innerHTML = `
    <h2>Admin Panel</h2>
    <div style="display: flex; gap: 0.5rem; margin-bottom: 2rem; border-bottom: 1px solid #ddd; padding-bottom: 0.5rem;">
      <button class="tab-btn" data-tab="profiles">Profiles</button>
      <button class="tab-btn" data-tab="events">Events</button>
      <button class="tab-btn" data-tab="interests">Interests</button>
      <button class="tab-btn" data-tab="locations">Locations</button>
      <button class="tab-btn" data-tab="all-tables">All Data (Debug)</button>
    </div>
    <div id="tab-content"></div>

    <div id="admin-modal-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: center;">
      <div id="admin-modal-content" style="background: white; padding: 2rem; border-radius: 8px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto;"></div>
    </div>
  `

  const tabContent = document.getElementById('tab-content')

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.style.fontWeight = 'normal')
      btn.style.fontWeight = 'bold'
      const tab = btn.dataset.tab
      if (tab === 'profiles') renderProfilesTab(tabContent)
      if (tab === 'events') renderEventsTab(tabContent)
      if (tab === 'interests') renderInterestsTab(tabContent)
      if (tab === 'locations') renderLocationsTab(tabContent)
      if (tab === 'all-tables') renderAllTablesTab(tabContent)
    }
  })

  // Start with Profiles
  document.querySelector('.tab-btn[data-tab="profiles"]').click()
}

// Utility to show/hide modal
function showModal(html, onRender = () => {}) {
  const overlay = document.getElementById('admin-modal-overlay')
  const modalContent = document.getElementById('admin-modal-content')
  modalContent.innerHTML = html
  overlay.style.display = 'flex'
  onRender()
}

function hideModal() {
  document.getElementById('admin-modal-overlay').style.display = 'none'
}

// PROFILES TAB
async function renderProfilesTab(container) {
  const profiles = await profilesApi.getAll()
  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <h3>Profiles Management</h3>
      <button id="admin-add-profile-btn" style="padding: 0.5rem 1rem; cursor: pointer; background: #28a745; color: white; border: none; border-radius: 4px;">Add New Profile</button>
    </div>
    <table>
      <thead>
        <tr><th>Name</th><th>Email</th><th>Age</th><th>Gender</th><th>Admin</th><th>Actions</th></tr>
      </thead>
      <tbody>
        ${profiles.map(p => `
          <tr>
            <td>${p.name}</td>
            <td>${p.email}</td>
            <td>${p.age ?? '-'}</td>
            <td>${p.gender ? 'Male' : 'Female'}</td>
            <td>${p.isAdmin ? 'Yes' : 'No'}</td>
            <td>
              <button class="edit-profile-btn" data-id="${p.id}">Edit</button>
              <button class="del-profile-btn" data-id="${p.id}" style="background: #dc3545; color: white; border: none; border-radius: 4px; padding: 0.25rem 0.5rem; cursor: pointer;">Delete</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `

  document.getElementById('admin-add-profile-btn').onclick = () => {
    showModal(`
      <h3>Add New Profile</h3>
      <form id="add-profile-form" style="display: flex; flex-direction: column; gap: 1rem;">
        <input id="add-name" placeholder="Name" required style="padding: 0.5rem;" />
        <input id="add-email" type="email" placeholder="Email" required style="padding: 0.5rem;" />
        <input id="add-password" type="password" placeholder="Password" required style="padding: 0.5rem;" />
        <input id="add-age" type="number" placeholder="Age" style="padding: 0.5rem;" />
        <select id="add-gender" style="padding: 0.5rem;">
          <option value="false">Female</option>
          <option value="true">Male</option>
        </select>
        <label style="display: flex; align-items: center; gap: 0.5rem;">
          <input type="checkbox" id="add-isadmin" /> Administrator
        </label>
        <div style="display: flex; gap: 1rem;">
          <button type="submit" style="background: #28a745; color: white; border: none; border-radius: 4px; padding: 0.5rem; flex: 1; cursor: pointer;">Create</button>
          <button type="button" class="close-modal-btn" style="background: #6c757d; color: white; border: none; border-radius: 4px; padding: 0.5rem; flex: 1; cursor: pointer;">Cancel</button>
        </div>
      </form>
    `, () => {
      document.querySelector('.close-modal-btn').onclick = hideModal
      document.getElementById('add-profile-form').onsubmit = async (e) => {
        e.preventDefault()
        try {
          await profilesApi.create({
            name: document.getElementById('add-name').value,
            email: document.getElementById('add-email').value,
            password: document.getElementById('add-password').value,
            age: parseInt(document.getElementById('add-age').value) || null,
            gender: document.getElementById('add-gender').value === 'true',
            isAdmin: document.getElementById('add-isadmin').checked
          })
          hideModal()
          renderProfilesTab(container)
        } catch (err) { alert('Failed to create: ' + err.message) }
      }
    })
  }

  document.querySelectorAll('.edit-profile-btn').forEach(btn => {
    btn.onclick = async () => {
      const p = await profilesApi.getById(btn.dataset.id)
      showModal(`
        <h3>Edit Profile</h3>
        <form id="edit-profile-form" style="display: flex; flex-direction: column; gap: 1rem;">
          <input type="text" id="edit-name" value="${p.name}" required style="padding: 0.5rem;" />
          <input type="email" id="edit-email" value="${p.email}" required style="padding: 0.5rem;" />
          <input type="number" id="edit-age" value="${p.age ?? ''}" style="padding: 0.5rem;" />
          <select id="edit-gender" style="padding: 0.5rem;">
            <option value="false" ${!p.gender ? 'selected' : ''}>Female</option>
            <option value="true" ${p.gender ? 'selected' : ''}>Male</option>
          </select>
          <input type="password" id="edit-password" value="${p.password}" placeholder="Password" required style="padding: 0.5rem;" />
          <label style="display: flex; align-items: center; gap: 0.5rem;">
            <input type="checkbox" id="edit-isadmin" ${p.isAdmin ? 'checked' : ''} /> Administrator
          </label>
          <div style="display: flex; gap: 1rem;">
            <button type="submit" style="background: #28a745; color: white; border: none; border-radius: 4px; padding: 0.5rem; flex: 1; cursor: pointer;">Save Changes</button>
            <button type="button" class="close-modal-btn" style="background: #6c757d; color: white; border: none; border-radius: 4px; padding: 0.5rem; flex: 1; cursor: pointer;">Cancel</button>
          </div>
        </form>
      `, () => {
        document.querySelector('.close-modal-btn').onclick = hideModal
        document.getElementById('edit-profile-form').onsubmit = async (e) => {
          e.preventDefault()
          try {
            await profilesApi.update(p.id, {
              ...p,
              name: document.getElementById('edit-name').value,
              email: document.getElementById('edit-email').value,
              age: parseInt(document.getElementById('edit-age').value) || null,
              gender: document.getElementById('edit-gender').value === 'true',
              password: document.getElementById('edit-password').value,
              isAdmin: document.getElementById('edit-isadmin').checked
            })
            hideModal()
            renderProfilesTab(container)
          } catch (err) { alert('Failed to update: ' + err.message) }
        }
      })
    }
  })

  document.querySelectorAll('.del-profile-btn').forEach(btn => {
    btn.onclick = async () => {
      if (confirm('Delete this profile?')) {
        await profilesApi.delete(btn.dataset.id)
        renderProfilesTab(container)
      }
    }
  })
}

// EVENTS TAB
async function renderEventsTab(container) {
  const events = await eventsApi.getAll()
  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <h3>Events Management</h3>
      <button id="admin-add-event-btn" style="padding: 0.5rem 1rem; cursor: pointer; background: #28a745; color: white; border: none; border-radius: 4px;">Add New Event</button>
    </div>
    <table>
      <thead><tr><th>Name</th><th>Time</th><th>Actions</th></tr></thead>
      <tbody>
        ${events.map(ev => `
          <tr>
            <td>${ev.name ?? '-'}</td>
            <td>${ev.time ?? '-'}</td>
            <td>
              <button class="edit-event-btn" data-id="${ev.id}">Edit</button>
              <button class="del-event-btn" data-id="${ev.id}" style="background: #dc3545; color: white;">Delete</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `

  document.getElementById('admin-add-event-btn').onclick = () => {
    showModal(`
      <h3>Add New Event</h3>
      <form id="add-event-form" style="display: flex; flex-direction: column; gap: 1rem;">
        <input id="ev-name" placeholder="Name" required style="padding: 0.5rem;" />
        <input id="ev-desc" placeholder="Description" style="padding: 0.5rem;" />
        <input id="ev-time" type="datetime-local" style="padding: 0.5rem;" />
        <div style="display: flex; gap: 1rem;">
          <button type="submit" style="background: #28a745; color: white; padding: 0.5rem; flex: 1;">Create</button>
          <button type="button" class="close-modal-btn" style="background: #6c757d; color: white; padding: 0.5rem; flex: 1;">Cancel</button>
        </div>
      </form>
    `, () => {
      document.querySelector('.close-modal-btn').onclick = hideModal
      document.getElementById('add-event-form').onsubmit = async (e) => {
        e.preventDefault()
        await eventsApi.create({
          name: document.getElementById('ev-name').value,
          description: document.getElementById('ev-desc').value || null,
          time: document.getElementById('ev-time').value || null,
          geopositionId: null, organizerId: null
        })
        hideModal(); renderEventsTab(container)
      }
    })
  }

  document.querySelectorAll('.edit-event-btn').forEach(btn => {
    btn.onclick = async () => {
      const ev = await eventsApi.getById(btn.dataset.id)
      showModal(`
        <h3>Edit Event</h3>
        <form id="edit-event-form" style="display: flex; flex-direction: column; gap: 1rem;">
          <input id="edit-ev-name" value="${ev.name ?? ''}" required style="padding: 0.5rem;" />
          <input id="edit-ev-desc" value="${ev.description ?? ''}" style="padding: 0.5rem;" />
          <input id="edit-ev-time" type="datetime-local" value="${ev.time ?? ''}" style="padding: 0.5rem;" />
          <div style="display: flex; gap: 1rem;">
            <button type="submit" style="background: #28a745; color: white; padding: 0.5rem; flex: 1;">Save</button>
            <button type="button" class="close-modal-btn" style="background: #6c757d; color: white; padding: 0.5rem; flex: 1;">Cancel</button>
          </div>
        </form>
      `, () => {
        document.querySelector('.close-modal-btn').onclick = hideModal
        document.getElementById('edit-event-form').onsubmit = async (e) => {
          e.preventDefault()
          await eventsApi.update(ev.id, {
            ...ev,
            name: document.getElementById('edit-ev-name').value,
            description: document.getElementById('edit-ev-desc').value || null,
            time: document.getElementById('edit-ev-time').value || null
          })
          hideModal(); renderEventsTab(container)
        }
      })
    }
  })

  document.querySelectorAll('.del-event-btn').forEach(btn => {
    btn.onclick = async () => {
      if (confirm('Delete this event?')) {
        await eventsApi.delete(btn.dataset.id)
        renderEventsTab(container)
      }
    }
  })
}

// INTERESTS TAB
async function renderInterestsTab(container) {
  const interests = await interestsApi.getAll()
  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <h3>Interests Management</h3>
      <button id="admin-add-interest-btn" style="background: #28a745; color: white; padding: 0.5rem 1rem; border: none; border-radius: 4px;">Add New Interest</button>
    </div>
    <ul>
      ${interests.map(i => `
        <li style="margin-bottom: 0.5rem;">
          <span>${i.interestName}</span>
          <button class="edit-int-btn" data-id="${i.id}" style="margin-left: 1rem;">Edit</button>
          <button class="del-int-btn" data-id="${i.id}" style="background: #dc3545; color: white;">Delete</button>
        </li>
      `).join('')}
    </ul>
  `

  document.getElementById('admin-add-interest-btn').onclick = async () => {
    const name = prompt('Interest Name:')
    if (name) {
      await interestsApi.create({ interestName: name })
      await renderInterestsTab(container)
    }
  }

  document.querySelectorAll('.edit-int-btn').forEach(btn => {
    btn.onclick = async () => {
      const i = await interestsApi.getById(btn.dataset.id)
      const newName = prompt('Edit Interest Name:', i.interestName)
      if (newName) {
        await interestsApi.update(i.id, { interestName: newName })
        renderInterestsTab(container)
      }
    }
  })

  document.querySelectorAll('.del-int-btn').forEach(btn => {
    btn.onclick = async () => {
      if (confirm('Delete this interest?')) {
        await interestsApi.delete(btn.dataset.id)
        renderInterestsTab(container)
      }
    }
  })
}

// LOCATIONS TAB
async function renderLocationsTab(container) {
  const locations = await locationsApi.getAll()
  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <h3>Locations Management</h3>
      <button id="admin-add-location-btn" style="background: #28a745; color: white; padding: 0.5rem 1rem;">Add New Location</button>
    </div>
    <table>
      <thead><tr><th>Description</th><th>Geoposition ID</th><th>Actions</th></tr></thead>
      <tbody>
        ${locations.map(loc => `
          <tr>
            <td>${loc.description ?? '-'}</td>
            <td>${loc.geopositionId ?? '-'}</td>
            <td>
              <button class="edit-loc-btn" data-id="${loc.id}">Edit</button>
              <button class="del-loc-btn" data-id="${loc.id}" style="background: #dc3545; color: white;">Delete</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `

  document.getElementById('admin-add-location-btn').onclick = () => {
    showModal(`
      <h3>Add New Location</h3>
      <form id="add-loc-form" style="display: flex; flex-direction: column; gap: 1rem;">
        <input id="loc-desc" placeholder="Description" required style="padding: 0.5rem;" />
        <div style="display: flex; gap: 1rem;">
          <button type="submit" style="background: #28a745; color: white; padding: 0.5rem; flex: 1;">Create</button>
          <button type="button" class="close-modal-btn" style="background: #6c757d; color: white; padding: 0.5rem; flex: 1;">Cancel</button>
        </div>
      </form>
    `, () => {
      document.querySelector('.close-modal-btn').onclick = hideModal
      document.getElementById('add-loc-form').onsubmit = async (e) => {
        e.preventDefault()
        await locationsApi.create({ description: document.getElementById('loc-desc').value, geopositionId: null })
        hideModal(); await renderLocationsTab(container)
      }
    })
  }

  document.querySelectorAll('.edit-loc-btn').forEach(btn => {
    btn.onclick = async () => {
      const loc = await locationsApi.getById(btn.dataset.id)
      showModal(`
        <h3>Edit Location</h3>
        <form id="edit-loc-form" style="display: flex; flex-direction: column; gap: 1rem;">
          <input id="edit-loc-desc" value="${loc.description ?? ''}" required style="padding: 0.5rem;" />
          <input id="edit-loc-geo" value="${loc.geopositionId ?? ''}" placeholder="Geoposition ID" style="padding: 0.5rem;" />
          <div style="display: flex; gap: 1rem;">
            <button type="submit" style="background: #28a745; color: white; padding: 0.5rem; flex: 1;">Save</button>
            <button type="button" class="close-modal-btn" style="background: #6c757d; color: white; padding: 0.5rem; flex: 1;">Cancel</button>
          </div>
        </form>
      `, () => {
        document.querySelector('.close-modal-btn').onclick = hideModal
        document.getElementById('edit-loc-form').onsubmit = async (e) => {
          e.preventDefault()
          await locationsApi.update(loc.id, {
            ...loc,
            description: document.getElementById('edit-loc-desc').value,
            geopositionId: document.getElementById('edit-loc-geo').value || null
          })
          hideModal(); renderLocationsTab(container)
        }
      })
    }
  })

  document.querySelectorAll('.del-loc-btn').forEach(btn => {
    btn.onclick = async () => {
      if (confirm('Delete this location?')) {
        await locationsApi.delete(btn.dataset.id)
        await renderLocationsTab(container)
      }
    }
  })
}

// ALL TABLES (DEBUG) TAB
async function renderAllTablesTab(container) {
  container.innerHTML = '<p>Loading all database tables...</p>'
  const collections = [
    { name: 'Profiles', api: profilesApi.getAll, delete: profilesApi.delete },
    { name: 'Events', api: eventsApi.getAll, delete: eventsApi.delete },
    { name: 'Interests', api: interestsApi.getAll, delete: interestsApi.delete },
    { name: 'Locations', api: locationsApi.getAll, delete: locationsApi.delete },
    { name: 'Geopositions', api: geopositionsApi.getAll, delete: geopositionsApi.delete },
    { name: 'Friends', api: friendsApi.getAll, delete: (item) => friendsApi.remove(item) },
    { 
      name: 'User Interests', 
      api: () => fetch('/api/user-interests').then(r => r.json()), 
      delete: (item) => fetch('/api/user-interests', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) })
    },
    { name: 'Favourite Events', api: favouriteEventsApi.getAll, delete: (item) => favouriteEventsApi.remove(item) },
    { name: 'Favourite Locations', api: favouriteLocationsApi.getAll, delete: (item) => favouriteLocationsApi.remove(item) },
  ]

  let html = '<h3>Full Database Contents</h3>'
  for (const coll of collections) {
    try {
      const data = await coll.api()
      html += `<details style="margin-bottom: 1rem; border: 1px solid #ccc; padding: 0.5rem; border-radius: 4px;">
        <summary style="cursor: pointer; font-weight: bold;">${coll.name} (${data.length})</summary>
        <div style="margin-top: 1rem; overflow-x: auto;">`
      
      if (data.length === 0) {
        html += '<p>No records found.</p>'
      } else {
        const headers = Object.keys(data[0])
        html += `<table>
          <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}<th>Actions</th></tr></thead>
          <tbody>
            ${data.map(item => `
              <tr>
                ${headers.map(h => `<td>${item[h] === null ? 'null' : item[h]}</td>`).join('')}
                <td><button onclick="window.adminDelete('${coll.name}', '${item.id || JSON.stringify(item)}')">Delete</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>`
      }
      html += `</div></details>`
    } catch (err) { html += `<p style="color: red">Error loading ${coll.name}: ${err.message}</p>` }
  }
  container.innerHTML = html

  window.adminDelete = async (collName, idOrJson) => {
    if (confirm(`Delete from ${collName}?`)) {
      const coll = collections.find(c => c.name === collName)
      try {
        if (idOrJson.startsWith('{')) {
          await coll.delete(JSON.parse(idOrJson))
        } else {
          await coll.delete(idOrJson)
        }
        renderAllTablesTab(container)
      } catch (err) { alert('Delete failed: ' + err.message) }
    }
  }
}
