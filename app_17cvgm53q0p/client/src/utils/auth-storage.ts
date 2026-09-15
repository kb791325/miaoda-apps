const LOGGED_OUT_FLAG_KEY = 'app_logged_out';

export function setLoggedOutFlag(): void {
  sessionStorage.setItem(LOGGED_OUT_FLAG_KEY, '1');
}

export function clearLoggedOutFlag(): void {
  sessionStorage.removeItem(LOGGED_OUT_FLAG_KEY);
}

export function hasLoggedOutFlag(): boolean {
  return sessionStorage.getItem(LOGGED_OUT_FLAG_KEY) === '1';
}
