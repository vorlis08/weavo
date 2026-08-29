import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { Dashboard } from './views/Dashboard'
import { CalendarView } from './views/CalendarView'
import { Board } from './views/Board'
import { Timeline } from './views/Timeline'
import { NotesMap } from './views/NotesMap'
import { Digest } from './views/Digest'
import { Triage } from './views/Triage'
import { MailView } from './views/MailView'
import { ProjectView } from './views/ProjectView'
import { RecordDetail } from './views/RecordDetail'
import { SettingsView } from './views/SettingsView'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="calendar" element={<CalendarView />} />
        <Route path="board" element={<Board />} />
        <Route path="timeline" element={<Timeline />} />
        <Route path="notes" element={<NotesMap />} />
        <Route path="digest" element={<Digest />} />
        <Route path="triage" element={<Triage />} />
        <Route path="mail" element={<MailView />} />
        <Route path="project/:id" element={<ProjectView />} />
        <Route path="item/:id" element={<RecordDetail />} />
        <Route path="settings" element={<SettingsView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
