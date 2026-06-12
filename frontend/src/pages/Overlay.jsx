import LiveRoundPanel from '../components/LiveRoundPanel';
import { useTriviaLive } from '../hooks/useTriviaLive';

/** Transparent OBS browser source — subscribe-only live view */
export default function Overlay() {
  const { round } = useTriviaLive();
  const showCorrect = round?.status === 'ended';

  return (
    <div className="overlay-page">
      <div className={`overlay-card ${round ? 'show': 'hide'}`}>
        <LiveRoundPanel round={round} showCorrect={showCorrect} countdownVariant="overlay" />
      </div>
    </div>
  );
}
