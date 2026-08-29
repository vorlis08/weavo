import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { Dashboard } from './views/Dashboard'
import { Kanban } from './views/Kanban'
import { RecordDetail } from './views/RecordDetail'
import { Placeholder } from './views/Placeholder'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="kanban" element={<Kanban />} />
        <Route path="item/:id" element={<RecordDetail />} />
        <Route path="calendar" element={<Placeholder id="calendar" />} />
        <Route path="timeline" element={<Placeholder id="timeline" />} />
        <Route path="notes" element={<Placeholder id="notes" />} />
        <Route path="digest" element={<Placeholder id="digest" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
