// Thin wrapper around NavCard with Transactions-specific title, description,
// and icon. Navigates to /transactions on click.

import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import { useNavigate } from 'react-router';

import { NavCard } from '@components/nav-card';

export function TransactionsNavCard() {
  const navigate = useNavigate();

  return (
    <NavCard
      icon={<ReceiptLongOutlinedIcon />}
      title="Transactions"
      description="View and manage account transactions."
      onClick={() => navigate('/transactions')}
    />
  );
}
