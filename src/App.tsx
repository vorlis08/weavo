import { Navigate, Route, Routes } from 'react-router-dom'
import { HouseView } from './views/Houses'
import { AppShell } from './components/AppShell'
import { Home } from './views/Home'
import { TodoView } from './views/TodoView'
import { CalendarView } from './views/CalendarView'
import { Board } from './views/Board'
import { Timeline } from './views/Timeline'
import { NotesMap } from './views/NotesMap'
import { Triage } from './views/Triage'
import { Guide } from './views/Guide'
import { MailView } from './views/MailView'
import { ProjectsView } from './views/ProjectsView'
import { ProjectView } from './views/ProjectView'
import { GoalsView } from './views/GoalsView'
import { GoalView } from './views/GoalView'
import { ReflectionView } from './views/ReflectionView'
import { RecordDetail } from './views/RecordDetail'
import { SettingsView } from './views/SettingsView'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path="todo" element={<TodoView />} />
        <Route path="todo/:space" element={<Navigate to="/todo" replace />} />
        <Route path="domy/:id" element={<HouseView />} />
        <Route path="calendar" element={<CalendarView />} />
        <Route path="board" element={<Board />} />
        <Route path="timeline" element={<Timeline />} />
        <Route path="notes" element={<NotesMap />} />
        <Route path="triage" element={<Triage />} />
        <Route path="guide" element={<Guide />} />
        <Route path="mail" element={<MailView />} />
        <Route path="projects" element={<ProjectsView />} />
        <Route path="project/:id" element={<ProjectView />} />
        <Route path="goals" element={<GoalsView />} />
        <Route path="goal/:id" element={<GoalView />} />
        <Route path="reflection" element={<ReflectionView />} />
        <Route path="item/:id" element={<RecordDetail />} />
        <Route path="settings" element={<SettingsView />} />
        {/* old views folded into Home and To-do */}
        <Route path="digest" element={<Navigate to="/" replace />} />
        <Route path="someday" element={<Navigate to="/todo" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
