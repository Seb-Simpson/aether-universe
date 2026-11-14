/** Fixed project-site mount shared by Next configuration and public asset URLs. */
export const BASE_PATH = "/aether-universe";
export function assetPath(path: string): string {
  return `${BASE_PATH}/${path.replace(/^\/+/, "")}`;
}
