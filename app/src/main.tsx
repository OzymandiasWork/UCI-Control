import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import '@fontsource-variable/inter'
import '@fontsource-variable/source-serif-4'
import './design-system/tokens.css'
import './design-system/global.css'
import './design-system/design-system.css'
import App from './App'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, gcTime: 24 * 60 * 60 * 1000 } },
})
const persister = createSyncStoragePersister({ storage: window.localStorage })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <App />
    </PersistQueryClientProvider>
  </React.StrictMode>,
)
