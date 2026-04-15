import { useCallback, useEffect, useRef } from 'react';
import { type Subscription } from 'rxjs';

import { Constants } from '@/constants/constants';
import { useLoggedData } from '@/providers';
import { type BufferService } from '@/services/buffer';

export function useBufferSubscription(bufferService: BufferService) {
  const { dispatch } = useLoggedData();
  const subscriptionRef = useRef<Subscription | null>(null);
  const currentServiceRef = useRef<BufferService | null>(null);

  const stableDispatch = useCallback(
    (action: any) => dispatch(action),
    [dispatch]
  );

  useEffect(() => {
    // Only create new subscription if service actually changed (reference equality)
    if (
      currentServiceRef.current === bufferService &&
      subscriptionRef.current
    ) {
      return; // Same service, keep existing subscription
    }

    // Cleanup existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    // Create new subscription
    subscriptionRef.current = bufferService
      .getFlushedData()
      .subscribe((data) => {
        stableDispatch({
          type: Constants.Reducers.AddData,
          payload: data,
        });
      });

    currentServiceRef.current = bufferService;

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [bufferService, stableDispatch]);

  return {
    cleanup: () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    },
  };
}
