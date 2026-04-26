export type Ping = () => string;

export interface ApiBridge {
  ping: Ping;
}
