import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CreateHouseholdForm } from '@pages/households/create-household-form';
import { createHousehold, ApiError } from '@services/households';

vi.mock('@services/households', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@services/households')>();
  return { ...actual, createHousehold: vi.fn() };
});

const mockCreateHousehold = vi.mocked(createHousehold);

const created = {
  id: 2,
  name: 'New Household',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  members: [],
};

function setup() {
  const onCreate = vi.fn();
  render(<CreateHouseholdForm onCreate={onCreate} />);
  return { onCreate };
}

describe('CreateHouseholdForm', () => {
  it('renders the input and create button', () => {
    setup();
    expect(screen.getByPlaceholderText('Household name')).toBeDefined();
    expect(screen.getByRole('button', { name: /create/i })).toBeDefined();
  });

  it('disables the button when input is empty', () => {
    setup();
    expect(screen.getByRole('button', { name: /create/i }).hasAttribute('disabled')).toBe(true);
  });

  it('enables the button when input has a value', () => {
    setup();
    fireEvent.change(screen.getByPlaceholderText('Household name'), {
      target: { value: 'New Household' },
    });
    expect(screen.getByRole('button', { name: /create/i }).hasAttribute('disabled')).toBe(false);
  });

  it('calls onCreate and clears input on success', async () => {
    mockCreateHousehold.mockResolvedValueOnce(created);
    const { onCreate } = setup();
    fireEvent.change(screen.getByPlaceholderText('Household name'), {
      target: { value: 'New Household' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith(created));
    expect((screen.getByPlaceholderText('Household name') as HTMLInputElement).value).toBe('');
  });

  it('submits on Enter key', async () => {
    mockCreateHousehold.mockResolvedValueOnce(created);
    const { onCreate } = setup();
    fireEvent.change(screen.getByPlaceholderText('Household name'), {
      target: { value: 'New Household' },
    });
    fireEvent.keyDown(screen.getByPlaceholderText('Household name'), { key: 'Enter' });
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith(created));
  });

  it('shows error and keeps input value on failure', async () => {
    mockCreateHousehold.mockRejectedValueOnce(
      new ApiError(400, 'You already have a household named "New Household".'),
    );
    setup();
    fireEvent.change(screen.getByPlaceholderText('Household name'), {
      target: { value: 'New Household' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    expect(
      await screen.findByText('You already have a household named "New Household".'),
    ).toBeDefined();
    expect((screen.getByPlaceholderText('Household name') as HTMLInputElement).value).toBe(
      'New Household',
    );
  });

  it('dismisses error on alert close', async () => {
    mockCreateHousehold.mockRejectedValueOnce(new ApiError(400, 'Something went wrong.'));
    setup();
    fireEvent.change(screen.getByPlaceholderText('Household name'), {
      target: { value: 'Test' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    await screen.findByText('Something went wrong.');
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByText('Something went wrong.')).toBeNull();
  });
});
