import { interestsApi } from '../api'
import { initAuth, contentDiv } from '../core'

initAuth(async (user) => {
  if (!user || !user.isAdmin) {
    window.location.href = '/'
    return
  }
  await renderInterests()
})

async function renderInterests() {
  const interests = await interestsApi.getAll()
  contentDiv.innerHTML = `
    <h2>Interests</h2>
    <form id="add-interest-form" style="margin-bottom: 1rem;">
      <input id="int-name" placeholder="Interest name" required />
      <button type="submit">Add Interest</button>
    </form>
    <ul id="interests-list"></ul>

    <div id="edit-interest-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: center;">
      <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 400px; width: 90%;">
        <h3>Edit Interest</h3>
        <form id="edit-interest-form" style="display: flex; flex-direction: column; gap: 1rem;">
          <input type="hidden" id="edit-int-id" />
          <input id="edit-int-name" placeholder="Interest name" required style="padding: 0.5rem;" />
          <div style="display: flex; gap: 1rem;">
            <button type="submit" style="padding: 0.5rem 1rem; cursor: pointer; background: #28a745; color: white; border: none; border-radius: 4px; flex: 1;">Save</button>
            <button type="button" id="edit-int-cancel" style="padding: 0.5rem 1rem; cursor: pointer; background: #6c757d; color: white; border: none; border-radius: 4px; flex: 1;">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `
  const ul = document.getElementById('interests-list')
  interests.forEach(i => {
    const li = document.createElement('li')
    li.style.marginBottom = '0.5rem'
    li.innerHTML = `
      <span>${i.interestName}</span>
      <button class="edit-btn" data-id="${i.id}" style="margin-left: 0.5rem;">Edit</button>
      <button class="del-btn" data-id="${i.id}" style="margin-left: 0.5rem; background: #dc3545; color: white; border: none; border-radius: 4px; padding: 0.2rem 0.4rem; cursor: pointer;">Delete</button>
    `
    ul.appendChild(li)
  })

  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.onclick = async () => {
      const i = await interestsApi.getById(btn.dataset.id)
      document.getElementById('edit-int-id').value = i.id
      document.getElementById('edit-int-name').value = i.interestName
      document.getElementById('edit-interest-modal').style.display = 'flex'
    }
  })

  document.getElementById('edit-int-cancel').onclick = () => {
    document.getElementById('edit-interest-modal').style.display = 'none'
  }

  document.getElementById('edit-interest-form').onsubmit = async (e) => {
    e.preventDefault()
    const id = document.getElementById('edit-int-id').value
    const interest = document.getElementById('edit-int-name').value
    try {
      // Need update endpoint? Let's check api.js
      await interestsApi.update(id, { interestName: interest })
      document.getElementById('edit-interest-modal').style.display = 'none'
      renderInterests()
    } catch (err) {
      alert('Failed to update interest: ' + err.message)
    }
  }

  document.querySelectorAll('.del-btn').forEach(btn => {
    btn.onclick = async () => {
      if (confirm('Are you sure you want to delete this interest?')) {
        await interestsApi.delete(btn.dataset.id)
        renderInterests()
      }
    }
  })

  document.getElementById('add-interest-form').onsubmit = async (e) => {
    e.preventDefault()
    await interestsApi.create({ interestName: document.getElementById('int-name').value })
    renderInterests()
  }
}
