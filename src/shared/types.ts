export interface ApiBridge {
  ping: () => string;
  quit: () => Promise<void>;
}
