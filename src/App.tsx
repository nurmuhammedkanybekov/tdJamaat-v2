import TeamPerformanceTracker from './TeamPerformanceTracker'
import { useNotifier } from './app/notify'


function App() {
  // Notifications for the house's conversation and announcements (when switched on).
  useNotifier();

  return (
    <>
      <TeamPerformanceTracker />
    </>
  )
}

export default App
