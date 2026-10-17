import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

// Reloads when the user comes back to the screen, e.g. after saving a log on another screen.
// Skips the first focus, because useAsync has just loaded.
export const useReloadOnFocus = (reload: () => void) => {
  const firstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      reload();
    }, [reload]),
  );
};
