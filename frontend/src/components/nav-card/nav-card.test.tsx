import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NavCard } from '@components/nav-card';

const defaultProps = {
  icon: <span data-testid="icon" />,
  title: 'Nav Card Title',
  description: 'Nav card description.',
  onClick: vi.fn(),
};

describe('NavCard', () => {
  it('renders title and description', () => {
    render(<NavCard {...defaultProps} />);
    expect(screen.getByText('Nav Card Title')).toBeDefined();
    expect(screen.getByText('Nav card description.')).toBeDefined();
  });

  it('renders the icon', () => {
    render(<NavCard {...defaultProps} />);
    expect(screen.getByTestId('icon')).toBeDefined();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<NavCard {...defaultProps} onClick={onClick} />);
    fireEvent.click(screen.getByText('Nav Card Title'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('shows chevron when not disabled', () => {
    render(<NavCard {...defaultProps} />);
    expect(screen.queryByText('Coming soon')).toBeNull();
  });

  it('shows "Coming soon" and does not call onClick when disabled', async () => {
    const onClick = vi.fn();
    render(<NavCard {...defaultProps} onClick={onClick} disabled />);
    expect(screen.getByText('Coming soon')).toBeDefined();
    fireEvent.click(screen.getByText('Nav Card Title'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
