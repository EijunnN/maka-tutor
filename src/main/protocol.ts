import { net, protocol } from 'electron';

export const SHOT_SCHEME = 'shot';

export function registerShotProtocol() {
  protocol.handle(SHOT_SCHEME, (request) => {
    const u = new URL(request.url);
    const decoded = decodeURIComponent(u.pathname.replace(/^\//, ''));
    return net.fetch(`file:///${decoded}`);
  });
}

export function pathToShotUrl(absolutePath: string): string {
  const normalized = absolutePath.replace(/\\/g, '/');
  return `${SHOT_SCHEME}://local/${encodeURIComponent(normalized)}`;
}
