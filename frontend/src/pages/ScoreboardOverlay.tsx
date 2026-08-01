import OverlayCustomStyles from '../components/OverlayCustomStyles';
import ScoreboardPanel from '../components/ScoreboardPanel';
import { useTriviaLive } from '../hooks/useTriviaLive';

/** Transparent OBS browser source — subscribe-only live view */
export default function ScoreboardOverlay() {
  const { scoreboard } = useTriviaLive();

  return (
    <div className="overlay-page">
      <OverlayCustomStyles />
      <div className="overlay-card" style={{ marginTop: '1rem' }}>
        <ScoreboardPanel entries={scoreboard} />
      </div>
    </div>
  );
}
