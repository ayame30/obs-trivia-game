import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TriviaLiveProvider } from './context/TriviaLiveContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Overlay from './pages/Overlay';
import ScoreboardOverlay from './pages/ScoreboardOverlay';
import Auth from './pages/Auth';

export default function App() {
  return (
    <BrowserRouter>
      <TriviaLiveProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="auth" element={<Auth />} />
          </Route>
          <Route path="overlay" element={<Overlay />} />
          <Route path="scoreboard-overlay" element={<ScoreboardOverlay />} />
        </Routes>
      </TriviaLiveProvider>
    </BrowserRouter>
  );
}
