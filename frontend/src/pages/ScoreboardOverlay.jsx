import LiveRoundPanel from '../components/LiveRoundPanel';
import ScoreboardPanel from '../components/ScoreboardPanel';
import { useTriviaLive } from '../hooks/useTriviaLive';

/** Transparent OBS browser source — subscribe-only live view */
export default function Overlay() {
  const { scoreboard } = useTriviaLive();

  return (
    <div className="overlay-page">
      <div className="overlay-card" style={{ marginTop: '1rem' }}>
          <ScoreboardPanel entries={scoreboard} />
        </div>
    </div>
  );
}
