import { fireEvent, render, screen } from '@testing-library/react-native';

import GivenButton from '@/components/features/given-button';

it('asks "Given?" and reports the tap', async () => {
  const onToggle = jest.fn();
  await render(<GivenButton given={false} medicineName="Antibiotic" onToggle={onToggle} />);

  await fireEvent.press(screen.getByRole('button', { name: 'Mark Antibiotic as given' }));
  expect(onToggle).toHaveBeenCalledTimes(1);
});

it('shows a given dose as done and says how to undo it', async () => {
  await render(<GivenButton given medicineName="Antibiotic" onToggle={jest.fn()} />);

  expect(screen.getByText('Given ✓')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Antibiotic given. Tap to undo.' })).toBeTruthy();
});
