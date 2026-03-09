import { eventsApi } from '../api'
import { initAuth, contentDiv } from '../core'

initAuth(async (user) => {
  if (!user || !user.isAdmin) {
    window.location.href = '/'
    return
  }
  await renderEvents()
})

async function renderEvents() {
  const events = await eventsApi.getAll()
  contentDiv.innerHTML = `
    <h2>Events</h2>
    <form id="add-event-form" style="margin-bottom: 1rem; display: flex; flex-wrap: wrap; gap: 0.5rem;">
      <input id="ev-name" placeholder="Name" />
      <input id="ev-desc" placeholder="Description" />
      <input id="ev-time" type="datetime-local" />
      <button type="submit">Add Event</button>
    </form>
    <table>
      <thead>
        <tr><th>Name</th><th>Description</th><th>Time</th><th>Actions</th></tr>
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
          <input id="edit-ev-time" type="datetime-local" style="padding: 0.5rem;" />
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
      <td>${ev.time ?? '-'}</td>
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
      document.getElementById('edit-ev-time').value = ev.time ?? ''
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
        time: document.getElementById('edit-ev-time').value || null
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
      time: document.getElementById('ev-time').value || null,
      geopositionId: null,
      organizerId: null
    })
    renderEvents()
  }
}
