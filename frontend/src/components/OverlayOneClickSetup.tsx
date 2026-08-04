import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ObsOneClickSetup from './ObsOneClickSetup';
import StreamlabsOneClickSetup from './StreamlabsOneClickSetup';

interface OverlayOneClickSetupProps {
  triviaUrl: string;
  scoreboardUrl: string;
  onOverlaysReady?: () => void;
}

export default function OverlayOneClickSetup({
  triviaUrl,
  scoreboardUrl,
  onOverlaysReady,
}: OverlayOneClickSetupProps) {
  const { t } = useTranslation();
  const [software, setSoftware] = useState<'obs' | 'streamlabs'>('obs');

  return (
    <div className="overlay-oneclick">
      <div className="overlay-tutor-tabs" role="tablist" aria-label={t('setup.overlaySoftwareTabs')}>
        <button
          type="button"
          role="tab"
          id="oneclick-software-obs"
          aria-selected={software === 'obs'}
          aria-controls="oneclick-software-panel"
          className={software === 'obs' ? 'is-active' : undefined}
          onClick={() => setSoftware('obs')}
        >
          {t('setup.overlayTabObs')}
        </button>
        <button
          type="button"
          role="tab"
          id="oneclick-software-streamlabs"
          aria-selected={software === 'streamlabs'}
          aria-controls="oneclick-software-panel"
          className={software === 'streamlabs' ? 'is-active' : undefined}
          onClick={() => setSoftware('streamlabs')}
        >
          {t('setup.overlayTabStreamlabs')}
        </button>
      </div>

      <div
        id="oneclick-software-panel"
        role="tabpanel"
        aria-labelledby={
          software === 'obs' ? 'oneclick-software-obs' : 'oneclick-software-streamlabs'
        }
      >
        {software === 'obs' ? (
          <ObsOneClickSetup
            triviaUrl={triviaUrl}
            scoreboardUrl={scoreboardUrl}
            onOverlaysReady={onOverlaysReady}
          />
        ) : (
          <StreamlabsOneClickSetup
            triviaUrl={triviaUrl}
            scoreboardUrl={scoreboardUrl}
            onOverlaysReady={onOverlaysReady}
          />
        )}
      </div>
    </div>
  );
}
