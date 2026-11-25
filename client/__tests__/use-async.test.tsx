import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useAsync } from '@/hooks/use-async';

it('is loading until the data arrives', async () => {
  let resolve: (value: string) => void = () => {};
  const pending = new Promise<string>((r) => (resolve = r));
  const { result } = await renderHook(() => useAsync(() => pending, []));
  expect(result.current.loading).toBe(true);
  expect(result.current.data).toBeNull();

  await act(async () => resolve('Mirri'));
  await waitFor(() => expect(result.current.data).toBe('Mirri'));
  expect(result.current.loading).toBe(false);
  expect(result.current.error).toBeNull();
});

it('reports an error', async () => {
  const { result } = await renderHook(() =>
    useAsync(async () => {
      throw new Error('offline');
    }, []),
  );
  await waitFor(() => expect(result.current.error?.message).toBe('offline'));
  expect(result.current.loading).toBe(false);
});

it('loads again on reload and when the deps change', async () => {
  const load = jest.fn(async (id: string) => `pet ${id}`);
  const { result, rerender } = await renderHook(({ id }: { id: string }) => useAsync(() => load(id), [id]), {
    initialProps: { id: 'a' },
  });
  await waitFor(() => expect(result.current.data).toBe('pet a'));

  await act(() => result.current.reload());
  await waitFor(() => expect(load).toHaveBeenCalledTimes(2));

  await rerender({ id: 'b' });
  await waitFor(() => expect(result.current.data).toBe('pet b'));
  expect(load).toHaveBeenCalledTimes(3);
});
