import { BrowserRouter, Routes, Route } from 'react-router';
import { TriviaLiveProvider } from './context/TriviaLiveContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Overlay from './pages/Overlay';
import ScoreboardOverlay from './pages/ScoreboardOverlay';
import Auth from './pages/Auth';
import Settings from './pages/Settings';
import Questions from './pages/Questions';

export default function App() {
  return (
    <BrowserRouter>
      <TriviaLiveProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="questions" element={<Questions />} />
            <Route path="auth" element={<Auth />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="overlay">
            <Route path="questions" element={<Overlay />} />
            <Route path="scoreboard" element={<ScoreboardOverlay />} />
          </Route>
        </Routes>
      </TriviaLiveProvider>
    </BrowserRouter>
  );
}
