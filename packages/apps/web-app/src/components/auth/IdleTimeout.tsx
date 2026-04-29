import React, { useEffect, useCallback, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

interface IdleTimeoutProps {
  timeoutInMinutes?: number;
}

const IdleTimeout: React.FC<IdleTimeoutProps> = ({ timeoutInMinutes = 15 }) => {
  const { isAuthenticated, logout } = useAuth0();
  const timeoutMs = timeoutInMinutes * 60 * 1000;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogout = useCallback(() => {
    if (isAuthenticated) {
      console.log('Sessão expirada por inatividade. Deslogando...');
      logout({ logoutParams: { returnTo: window.location.origin } });
    }
  }, [isAuthenticated, logout]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(handleLogout, timeoutMs);
  }, [handleLogout, timeoutMs]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Inicia o timer
    resetTimer();

    // Adiciona event listeners para resetar o timer em caso de atividade
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isAuthenticated, resetTimer]);

  return null; // Este componente não renderiza nada
};

export default IdleTimeout;
