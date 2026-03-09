import { initAuth } from '../core'
import { renderAdminPanel } from '../admin-ui'

initAuth(async (user) => {
  if (!user || !user.isAdmin) {
    window.location.href = '/'
    return
  }
  await renderAdminPanel()
})
