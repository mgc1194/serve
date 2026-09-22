// Thin wrapper around NavCard with budget-specific title, description,
// and icon. Navigates to /budgets on click.

import PieChartOutlineIcon from '@mui/icons-material/PieChartOutline';
import { useNavigate } from 'react-router';

import { NavCard } from '@components/nav-card';

export function BudgetsNavCard() {
  const navigate = useNavigate();

  return (
    <NavCard
      icon={<PieChartOutlineIcon />}
      title="Budgets"
      description="Manage categories and track spending against targets."
      onClick={() => navigate('/budgets')}
    />
  );
}
