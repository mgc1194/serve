// Thin wrapper around NavCard with household-specific title, description,
// and icon. Navigates to /households on click.

import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import { useNavigate } from 'react-router';

import { NavCard } from '@components/nav-card';

export function AccountsNavCard() {
  const navigate = useNavigate();

  return (
    <NavCard
      icon={<AccountBalanceOutlinedIcon />}
      title="Accounts"
      description="View and manage your financial accounts."
      onClick={() => navigate('/accounts')}
    />
  );
}
