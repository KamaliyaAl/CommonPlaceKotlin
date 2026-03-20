import { eventsApi } from '../api'
import { initAuth, contentDiv } from '../core'

initAuth(async (user) => {
  if (!user || !user.isAdmin) {
    window.location.href = '/'
    return
  }
  await renderEvents()
})

function formatDT(iso) {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return d.toLocaleString()
  } catch (e) { return iso }
}

async function renderEvents() {
  const events = await eventsApi.getAll()
  contentDiv.innerHTML = `
    <h2>Events</h2>
    <form id="add-event-form" style="margin-bottom: 1rem; display: flex; flex-wrap: wrap; gap: 0.5rem;">
      <input id="ev-name" placeholder="Name" />
      <input id="ev-desc" placeholder="Description" />
      <input id="ev-price" placeholder="Price (€)" />
      <input id="ev-startTime" type="datetime-local" placeholder="Start Time" />
      <input id="ev-endTime" type="datetime-local" placeholder="End Time" />
      <button type="submit">Add Event</button>
    </form>
    <table>
      <thead>
        <tr><th>Name</th><th>Description</th><th>Start Time</th><th>End Time</th><th>Price (€)</th><th>Actions</th></tr>
      </thead>
      <tbody id="events-table-body"></tbody>
    </table>

    <div id="edit-event-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: center;">
      <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 400px; width: 90%;">
        <h3>Edit Event</h3>
        <form id="edit-event-form" style="display: flex; flex-direction: column; gap: 1rem;">
          <input type="hidden" id="edit-ev-id" />
          <input id="edit-ev-name" placeholder="Name" style="padding: 0.5rem;" />
          <input id="edit-ev-desc" placeholder="Description" style="padding: 0.5rem;" />
          <input id="edit-ev-price" placeholder="Price (€)" style="padding: 0.5rem;" />
          <label>Start Time:</label>
          <input id="edit-ev-startTime" type="datetime-local" style="padding: 0.5rem;" />
          <label>End Time:</label>
          <input id="edit-ev-endTime" type="datetime-local" style="padding: 0.5rem;" />
          <div style="display: flex; gap: 1rem;">
            <button type="submit" style="padding: 0.5rem 1rem; cursor: pointer; background: #28a745; color: white; border: none; border-radius: 4px; flex: 1;">Save</button>
            <button type="button" id="edit-ev-cancel" style="padding: 0.5rem 1rem; cursor: pointer; background: #6c757d; color: white; border: none; border-radius: 4px; flex: 1;">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `
  const tbody = document.getElementById('events-table-body')
  events.forEach(ev => {
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td>${ev.name ?? '-'}</td>
      <td>${ev.description ?? '-'}</td>
      <td>${formatDT(ev.startTime ?? ev.time)}</td>
      <td>${formatDT(ev.endTime)}</td>
      <td>${ev.price ? ev.price + '€' : '-'}</td>
      <td>
        <button class="edit-btn" data-id="${ev.id}">Edit</button>
        <button class="del-btn" data-id="${ev.id}" style="background: #dc3545; color: white; border: none; border-radius: 4px; padding: 0.25rem 0.5rem; cursor: pointer;">Delete</button>
      </td>
    `
    tbody.appendChild(tr)
  })

  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.onclick = async () => {
      const ev = await eventsApi.getById(btn.dataset.id)
      document.getElementById('edit-ev-id').value = ev.id
      document.getElementById('edit-ev-name').value = ev.name ?? ''
      document.getElementById('edit-ev-desc').value = ev.description ?? ''
      document.getElementById('edit-ev-price').value = ev.price ?? ''
      document.getElementById('edit-ev-startTime').value = ev.startTime ?? ev.time ?? ''
      document.getElementById('edit-ev-endTime').value = ev.endTime ?? ''
      document.getElementById('edit-event-modal').style.display = 'flex'
    }
  })

  document.getElementById('edit-ev-cancel').onclick = () => {
    document.getElementById('edit-event-modal').style.display = 'none'
  }

  document.getElementById('edit-event-form').onsubmit = async (e) => {
    e.preventDefault()
    const id = document.getElementById('edit-ev-id').value
    try {
      const existing = await eventsApi.getById(id)
      await eventsApi.update(id, {
        ...existing,
        name: document.getElementById('edit-ev-name').value || null,
        description: document.getElementById('edit-ev-desc').value || null,
        price: document.getElementById('edit-ev-price').value || null,
        startTime: document.getElementById('edit-ev-startTime').value || null,
        endTime: document.getElementById('edit-ev-endTime').value || null
      })
      document.getElementById('edit-event-modal').style.display = 'none'
      renderEvents()
    } catch (err) {
      alert('Failed to update event: ' + err.message)
    }
  }

  document.querySelectorAll('.del-btn').forEach(btn => {
    btn.onclick = async () => {
      await eventsApi.delete(btn.dataset.id)
      renderEvents()
    }
  })

  document.getElementById('add-event-form').onsubmit = async (e) => {
    e.preventDefault()
    await eventsApi.create({
      name: document.getElementById('ev-name').value || null,
      description: document.getElementById('ev-desc').value || null,
      price: document.getElementById('ev-price').value || null,
      startTime: document.getElementById('ev-startTime').value || null,
      endTime: document.getElementById('ev-endTime').value || null,
      geopositionId: null,
      organizerId: null
    })
    renderEvents()
  }
}
