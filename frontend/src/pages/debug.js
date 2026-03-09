import { profilesApi, eventsApi, interestsApi, locationsApi } from '../api'
import { initAuth, contentDiv } from '../core'

initAuth(async (user) => {
  if (!user || !user.isAdmin) {
    window.location.href = '/'
    return
  }
  await renderDebugDashboard()
})

async function renderDebugDashboard() {
  contentDiv.innerHTML = '<h2>Debug Dashboard</h2><div id="debug-tables"></div>'
  const debugTables = document.getElementById('debug-tables')
  
  const collections = [
    { name: 'Profiles', api: profilesApi.getAll, delete: profilesApi.delete },
    { name: 'Events', api: eventsApi.getAll, delete: eventsApi.delete },
    { name: 'Interests', api: interestsApi.getAll, delete: interestsApi.delete },
    { name: 'Locations', api: locationsApi.getAll, delete: locationsApi.delete },
    { name: 'Geopositions', api: geopositionsApi.getAll, delete: geopositionsApi.delete },
    { 
      name: 'Friends', 
      api: friendsApi.getAll, 
      delete: (item) => friendsApi.remove(item) 
    },
    { 
      name: 'User Interests', 
      api: () => fetch('/api/user-interests').then(r => r.json()), 
      delete: (item) => fetch('/api/user-interests', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) })
    },
    { 
      name: 'Favourite Events', 
      api: favouriteEventsApi.getAll, 
      delete: (item) => favouriteEventsApi.remove(item)
    },
    { 
      name: 'Favourite Locations', 
      api: favouriteLocationsApi.getAll, 
      delete: (item) => favouriteLocationsApi.remove(item)
    },
  ]

  for (const coll of collections) {
    try {
      const data = await coll.api()
      const section = document.createElement('section')
      section.style.marginBottom = '2rem'
      section.style.border = '1px solid #ccc'
      section.style.padding = '1rem'
      section.style.borderRadius = '8px'
      section.innerHTML = `<h3>${coll.name} (${data.length})</h3>`
      
      if (data.length === 0) {
        section.innerHTML += '<p>Empty</p>'
      } else {
        const headers = Object.keys(data[0])
        const table = document.createElement('table')
        table.style.width = '100%'
        table.style.borderCollapse = 'collapse'
        
        const thead = document.createElement('thead')
        thead.innerHTML = `<tr>
          ${headers.map(h => `<th style="padding: 8px; text-align: left; background: #eee; border-bottom: 2px solid #ddd;">${h}</th>`).join('')}
          <th style="padding: 8px; text-align: left; background: #eee; border-bottom: 2px solid #ddd;">Actions</th>
        </tr>`
        table.appendChild(thead)
        
        const tbody = document.createElement('tbody')
        data.forEach(item => {
          const tr = document.createElement('tr')
          tr.innerHTML = headers.map(h => {
            const val = item[h]
            return `<td style="padding: 8px; border-bottom: 1px solid #ddd;">${val === null ? '<em>null</em>' : (typeof val === 'boolean' ? (val ? 'true' : 'false') : val)}</td>`
          }).join('')
          
          const actionsTd = document.createElement('td')
          actionsTd.style.padding = '8px'
          actionsTd.style.borderBottom = '1px solid #ddd'
          const delBtn = document.createElement('button')
          delBtn.textContent = 'Delete'
          delBtn.style.background = '#dc3545'
          delBtn.style.color = 'white'
          delBtn.style.border = 'none'
          delBtn.style.borderRadius = '4px'
          delBtn.style.padding = '4px 8px'
          delBtn.style.cursor = 'pointer'
          delBtn.onclick = async () => {
            if (confirm(`Delete this item from ${coll.name}?`)) {
              try {
                // Some APIs take ID, others take the whole object (many-to-many)
                if (coll.name === 'Profiles' || coll.name === 'Events' || coll.name === 'Interests' || coll.name === 'Locations' || coll.name === 'Geopositions') {
                  await coll.delete(item.id)
                } else {
                  await coll.delete(item)
                }
                renderDebugDashboard()
              } catch (err) {
                alert('Delete failed: ' + err.message)
              }
            }
          }
          actionsTd.appendChild(delBtn)
          tr.appendChild(actionsTd)
          tbody.appendChild(tr)
        })
        table.appendChild(tbody)
        section.appendChild(table)
      }
      debugTables.appendChild(section)
    } catch (err) {
      debugTables.innerHTML += `<p style="color: red">Failed to load ${coll.name}: ${err.message}</p>`
    }
  }
}
