export const isLocalhost = (): boolean => {
  return window.location.hostname === 'localhost';
};

export const isDevelopmentMode = (): boolean => {
  return isLocalhost();
}; 