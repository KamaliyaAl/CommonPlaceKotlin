import { locationsApi } from '../api'
import { initAuth, contentDiv } from '../core'

initAuth(async (user) => {
  if (!user || !user.isAdmin) {
    window.location.href = '/'
    return
  }
  await renderLocations()
})

async function renderLocations() {
  const locations = await locationsApi.getAll()
  contentDiv.innerHTML = `
    <h2>Locations</h2>
    <form id="add-location-form" style="margin-bottom: 1rem;">
      <input id="loc-desc" placeholder="Description" />
      <button type="submit">Add Location</button>
    </form>
    <table>
      <thead>
        <tr><th>ID</th><th>Description</th><th>Geoposition</th><th>Actions</th></tr>
      </thead>
      <tbody id="locations-table-body"></tbody>
    </table>

    <div id="edit-location-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: center;">
      <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 400px; width: 90%;">
        <h3>Edit Location</h3>
        <form id="edit-location-form" style="display: flex; flex-direction: column; gap: 1rem;">
          <input type="hidden" id="edit-loc-id" />
          <input id="edit-loc-desc" placeholder="Description" style="padding: 0.5rem;" />
          <input id="edit-loc-geoposition" placeholder="Geoposition ID" style="padding: 0.5rem;" />
          <div style="display: flex; gap: 1rem;">
            <button type="submit" style="padding: 0.5rem 1rem; cursor: pointer; background: #28a745; color: white; border: none; border-radius: 4px; flex: 1;">Save</button>
            <button type="button" id="edit-loc-cancel" style="padding: 0.5rem 1rem; cursor: pointer; background: #6c757d; color: white; border: none; border-radius: 4px; flex: 1;">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `
  const tbody = document.getElementById('locations-table-body')
  locations.forEach(loc => {
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td>${loc.id}</td>
      <td>${loc.description ?? '-'}</td>
      <td>${loc.geopositionId ?? '-'}</td>
      <td>
        <button class="edit-btn" data-id="${loc.id}">Edit</button>
        <button class="del-btn" data-id="${loc.id}" style="background: #dc3545; color: white; border: none; border-radius: 4px; padding: 0.25rem 0.5rem; cursor: pointer;">Delete</button>
      </td>
    `
    tbody.appendChild(tr)
  })

  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.onclick = async () => {
      const loc = await locationsApi.getById(btn.dataset.id)
      document.getElementById('edit-loc-id').value = loc.id
      document.getElementById('edit-loc-desc').value = loc.description ?? ''
      document.getElementById('edit-loc-geoposition').value = loc.geopositionId ?? ''
      document.getElementById('edit-location-modal').style.display = 'flex'
    }
  })

  document.getElementById('edit-loc-cancel').onclick = () => {
    document.getElementById('edit-location-modal').style.display = 'none'
  }

  document.getElementById('edit-location-form').onsubmit = async (e) => {
    e.preventDefault()
    const id = document.getElementById('edit-loc-id').value
    try {
      const existing = await locationsApi.getById(id)
      await locationsApi.update(id, {
        ...existing,
        description: document.getElementById('edit-loc-desc').value || null,
        geopositionId: document.getElementById('edit-loc-geoposition').value || null
      })
      document.getElementById('edit-location-modal').style.display = 'none'
      renderLocations()
    } catch (err) {
      alert('Failed to update location: ' + err.message)
    }
  }

  document.querySelectorAll('.del-btn').forEach(btn => {
    btn.onclick = async () => {
      if (confirm('Are you sure you want to delete this location?')) {
        await locationsApi.delete(btn.dataset.id)
        renderLocations()
      }
    }
  })

  document.getElementById('add-location-form').onsubmit = async (e) => {
    e.preventDefault()
    await locationsApi.create({
      description: document.getElementById('loc-desc').value || null,
      geopositionId: null
    })
    renderLocations()
  }
}
