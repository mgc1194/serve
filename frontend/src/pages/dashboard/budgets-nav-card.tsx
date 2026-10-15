// Thin wrapper around NavCard with Budgets-specific title, description,
// and icon. Navigates to /budgets on click.

import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import { useNavigate } from 'react-router';

import { NavCard } from '@components/nav-card';

export function BudgetsNavCard() {
  const navigate = useNavigate();

  return (
    <NavCard
      icon={<AccountBalanceWalletOutlinedIcon />}
      title="Budgets"
      description="Plan and track spending against your budgets."
      onClick={() => navigate('/budgets')}
    />
  );
}
