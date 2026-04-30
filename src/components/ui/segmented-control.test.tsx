import React from 'react';

import { cleanup, screen, setup } from '@/lib/test-utils';

import { SegmentedControl } from './segmented-control';

afterEach(cleanup);

describe('SegmentedControl', () => {
  test('renders options and fires onChange', async () => {
    const onChange = jest.fn();
    const { user } = setup(
      <SegmentedControl
        value="both"
        options={[
          { value: 'both', label: 'Both' },
          { value: 'private', label: 'Private' },
          { value: 'public', label: 'Public' },
        ]}
        onChange={onChange}
        testID="segmented"
      />
    );

    expect(screen.getByTestId('segmented')).toBeOnTheScreen();
    expect(screen.getByText('Both')).toBeOnTheScreen();
    expect(screen.getByText('Private')).toBeOnTheScreen();
    expect(screen.getByText('Public')).toBeOnTheScreen();

    await user.press(screen.getByTestId('segmented-public'));
    expect(onChange).toHaveBeenCalledWith('public');
  });
});
