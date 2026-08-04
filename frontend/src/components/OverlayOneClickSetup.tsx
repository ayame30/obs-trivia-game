import ObsOneClickSetup from './ObsOneClickSetup';
import StreamlabsOneClickSetup from './StreamlabsOneClickSetup';

interface OverlayOneClickSetupProps {
  software: 'obs' | 'streamlabs';
  triviaUrl: string;
  scoreboardUrl: string;
  onOverlaysReady?: () => void;
}

export default function OverlayOneClickSetup({
  software,
  triviaUrl,
  scoreboardUrl,
  onOverlaysReady,
}: OverlayOneClickSetupProps) {
  if (software === 'obs') {
    return (
      <ObsOneClickSetup
        triviaUrl={triviaUrl}
        scoreboardUrl={scoreboardUrl}
        onOverlaysReady={onOverlaysReady}
      />
    );
  }

  return (
    <StreamlabsOneClickSetup
      triviaUrl={triviaUrl}
      scoreboardUrl={scoreboardUrl}
      onOverlaysReady={onOverlaysReady}
    />
  );
}
