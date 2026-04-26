import { app, desktopCapturer, screen, type NativeImage } from 'electron';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface CaptureRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CaptureResult {
  path: string;
  width: number;
  height: number;
  displayId: number;
}

async function getDisplaySource(displayId: number): Promise<{
  thumbnail: NativeImage;
  display: Electron.Display;
}> {
  const display =
    screen.getAllDisplays().find((d) => d.id === displayId) ?? screen.getPrimaryDisplay();
  const realW = Math.round(display.size.width * display.scaleFactor);
  const realH = Math.round(display.size.height * display.scaleFactor);

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: realW, height: realH },
  });

  const source =
    sources.find((s) => Number(s.display_id) === display.id) ?? sources[0];
  if (!source) throw new Error('No screen source available');

  return { thumbnail: source.thumbnail, display };
}

async function savePng(buffer: Buffer): Promise<string> {
  const dir = join(app.getPath('temp'), 'aprende-mierda', 'shots');
  await mkdir(dir, { recursive: true });
  const fpath = join(dir, `shot-${Date.now()}.png`);
  await writeFile(fpath, buffer);
  return fpath;
}

export async function captureMonitorAtCursor(): Promise<CaptureResult> {
  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);
  const { thumbnail } = await getDisplaySource(display.id);
  const path = await savePng(thumbnail.toPNG());
  const size = thumbnail.getSize();
  return { path, width: size.width, height: size.height, displayId: display.id };
}

export async function captureRegion(
  displayId: number,
  rect: CaptureRect,
): Promise<CaptureResult> {
  const { thumbnail, display } = await getDisplaySource(displayId);
  const scale = display.scaleFactor;

  const cropX = Math.max(0, Math.round(rect.x * scale));
  const cropY = Math.max(0, Math.round(rect.y * scale));
  const cropW = Math.max(1, Math.round(rect.width * scale));
  const cropH = Math.max(1, Math.round(rect.height * scale));

  const cropped = thumbnail.crop({
    x: cropX,
    y: cropY,
    width: cropW,
    height: cropH,
  });
  const path = await savePng(cropped.toPNG());
  const size = cropped.getSize();
  return { path, width: size.width, height: size.height, displayId };
}
