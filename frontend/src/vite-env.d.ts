/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GRAPHQL_HTTP?: string;
  readonly VITE_GRAPHQL_WS?: string;
  readonly VITE_TWITCH_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ObsTriviaDesktop {
  readonly isElectron: true;
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  getSecret: (service: string, account: string) => Promise<string | null>;
  setSecret: (service: string, account: string, password: string) => Promise<boolean>;
  deleteSecret: (service: string, account: string) => Promise<boolean>;
}

interface Window {
  obsTriviaDesktop?: ObsTriviaDesktop;
}
