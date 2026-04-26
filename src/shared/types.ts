export interface ApiBridge {
  ping: () => string;
  quit: () => Promise<void>;
  setClickthrough: (enabled: boolean) => Promise<void>;
}
