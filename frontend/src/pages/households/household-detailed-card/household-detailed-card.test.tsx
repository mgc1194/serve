import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HouseholdDetailCard } from '@pages/households/household-detailed-card';
import { renameHousehold, deleteHousehold, addMember, ApiError } from '@services/households';

vi.mock('@services/households', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@services/households')>();
  return { ...actual, renameHousehold: vi.fn(), deleteHousehold: vi.fn(), addMember: vi.fn() };
});

const mockRenameHousehold = vi.mocked(renameHousehold);
const mockDeleteHousehold = vi.mocked(deleteHousehold);
const mockAddMember = vi.mocked(addMember);

const household = {
  id: 1,
  name: 'Test Household',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  members: [{ id: 1, email: 'test@example.com', first_name: 'Test', last_name: 'User' }],
};

function setup(overrides: Partial<typeof household> = {}) {
  const onUpdated = vi.fn();
  const onDeleted = vi.fn();
  render(
    <HouseholdDetailCard
      household={{ ...household, ...overrides }}
      onUpdated={onUpdated}
      onDeleted={onDeleted}
    />,
  );
  return { onUpdated, onDeleted };
}

beforeEach(() => { vi.clearAllMocks(); });

// Rendering
describe('HouseholdDetailCard rendering', () => {
  it('renders household name', () => {
    setup();
    expect(screen.getByText('Test Household')).toBeDefined();
  });
  it('renders member initials and email', () => {
    setup();
    expect(screen.getByText('TU')).toBeDefined();
    expect(screen.getByText('test@example.com')).toBeDefined();
  });
  it('shows empty members message when no members', () => {
    setup({ members: [] });
    expect(screen.getByText('No members yet.')).toBeDefined();
  });
});

// Rename
describe('HouseholdDetailCard rename', () => {
  it('shows input with current name when rename is clicked', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /rename/i }));
    expect(screen.getByDisplayValue('Test Household')).toBeDefined();
  });
  it('calls onUpdated with new name on save', async () => {
    mockRenameHousehold.mockResolvedValueOnce({ ...household, name: 'Renamed' });
    const { onUpdated } = setup();
    fireEvent.click(screen.getByRole('button', { name: /rename/i }));
    fireEvent.change(screen.getByDisplayValue('Test Household'), { target: { value: 'Renamed' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(onUpdated).toHaveBeenCalledWith({ ...household, name: 'Renamed' }));
  });
  it('saves on Enter key', async () => {
    mockRenameHousehold.mockResolvedValueOnce({ ...household, name: 'Renamed' });
    const { onUpdated } = setup();
    fireEvent.click(screen.getByRole('button', { name: /rename/i }));
    fireEvent.change(screen.getByDisplayValue('Test Household'), { target: { value: 'Renamed' } });
    fireEvent.keyDown(screen.getByDisplayValue('Renamed'), { key: 'Enter' });
    await waitFor(() => expect(onUpdated).toHaveBeenCalled());
  });
  it('cancels editing on Escape key', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /rename/i }));
    fireEvent.keyDown(screen.getByDisplayValue('Test Household'), { key: 'Escape' });
    expect(screen.queryByDisplayValue('Test Household')).toBeNull();
    expect(screen.getByText('Test Household')).toBeDefined();
  });
  it('cancels editing on cancel button click', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /rename/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByDisplayValue('Test Household')).toBeNull();
  });
  it('shows rename error on failure', async () => {
    mockRenameHousehold.mockRejectedValueOnce(new ApiError(400, 'Name already taken.'));
    setup();
    fireEvent.click(screen.getByRole('button', { name: /rename/i }));
    fireEvent.change(screen.getByDisplayValue('Test Household'), { target: { value: 'Other' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByText('Name already taken.')).toBeDefined();
  });
});

// Add member
describe('HouseholdDetailCard add member', () => {
  it('calls onUpdated with new member on success', async () => {
    const updated = { ...household, members: [...household.members, { id: 2, email: 'new@example.com', first_name: 'New', last_name: 'Person' }] };
    mockAddMember.mockResolvedValueOnce(updated);
    const { onUpdated } = setup();
    fireEvent.change(screen.getByPlaceholderText('Add by email address'), { target: { value: 'new@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /add member/i }));
    await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(updated));
  });
  it('clears email input after successful add', async () => {
    mockAddMember.mockResolvedValueOnce({ ...household, members: [...household.members, { id: 2, email: 'new@example.com', first_name: 'New', last_name: 'Person' }] });
    setup();
    fireEvent.change(screen.getByPlaceholderText('Add by email address'), { target: { value: 'new@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /add member/i }));
    await waitFor(() => expect((screen.getByPlaceholderText('Add by email address') as HTMLInputElement).value).toBe(''));
  });
  it('shows error when email not found', async () => {
    mockAddMember.mockRejectedValueOnce(new ApiError(400, 'No account found with that email address.'));
    setup();
    fireEvent.change(screen.getByPlaceholderText('Add by email address'), { target: { value: 'unknown@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /add member/i }));
    expect(await screen.findByText('No account found with that email address.')).toBeDefined();
  });
});

// Delete
describe('HouseholdDetailCard delete', () => {
  it('shows confirm buttons after clicking delete', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /delete household/i }));
    expect(screen.getByRole('button', { name: /yes, delete/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDefined();
  });
  it('cancels delete on cancel click', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /delete household/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('button', { name: /yes, delete/i })).toBeNull();
  });
  it('calls onDeleted with household id on success', async () => {
    mockDeleteHousehold.mockResolvedValueOnce(undefined);
    const { onDeleted } = setup();
    fireEvent.click(screen.getByRole('button', { name: /delete household/i }));
    fireEvent.click(screen.getByRole('button', { name: /yes, delete/i }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith(1));
  });
  it('shows delete error on failure', async () => {
    mockDeleteHousehold.mockRejectedValueOnce(new ApiError(409, 'This household still has accounts.'));
    setup();
    fireEvent.click(screen.getByRole('button', { name: /delete household/i }));
    fireEvent.click(screen.getByRole('button', { name: /yes, delete/i }));
    expect(await screen.findByText('This household still has accounts.')).toBeDefined();
  });
});
