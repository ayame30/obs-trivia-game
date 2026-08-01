import { useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_APP_SETTINGS } from '../graphql/operations';
import type { GetAppSettingsData } from '../types';

const STYLE_ID = 'overlay-custom-css';

/** Injects Settings → Overlay custom CSS into OBS browser sources. */
export default function OverlayCustomStyles() {
  const { data } = useQuery<GetAppSettingsData>(GET_APP_SETTINGS, {
    pollInterval: 4000,
    fetchPolicy: 'cache-and-network',
  });
  const css = data?.appSettings?.overlayCustomCss ?? '';

  useEffect(() => {
    let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent = css;
    return () => {
      // Keep the tag while overlays remount; clear only if empty on cleanup of last use.
    };
  }, [css]);

  return null;
}
