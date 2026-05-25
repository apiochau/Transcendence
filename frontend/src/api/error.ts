import axios from 'axios';

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      return 'Le serveur ne repond pas. Verifie que le backend est demarre.';
    }

    const message = error.response?.data?.message;
    if (Array.isArray(message)) {
      return message.join(' ');
    }

    if (typeof message === 'string') {
      return message;
    }

    if (!error.response) {
      return 'Impossible de contacter le serveur.';
    }
  }

  return fallback;
}
