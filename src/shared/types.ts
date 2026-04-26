export type ScreenshotMode = 'full' | 'region';

export interface ScreenshotEvent {
  path: string;
  url: string;
  width: number;
  height: number;
  displayId: number;
  mode: ScreenshotMode;
}

export interface ScreenshotError {
  message: string;
}

export interface EventsBridge {
  onScreenshot: (cb: (data: ScreenshotEvent) => void) => () => void;
  onScreenshotError: (cb: (err: ScreenshotError) => void) => () => void;
}

export interface ApiBridge {
  ping: () => string;
  quit: () => Promise<void>;
  setClickthrough: (enabled: boolean) => Promise<void>;
}
