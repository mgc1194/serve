// pages/dashboard/summary-nav-card.tsx — Dashboard card linking to /summary.

import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import { useNavigate } from 'react-router';

import { NavCard } from '@components/nav-card';

export function SummaryNavCard() {
  const navigate = useNavigate();

  return (
    <NavCard
      icon={<BarChartOutlinedIcon />}
      title="Summary"
      description="View spending and earnings aggregated by label and category."
      onClick={() => navigate('/summary')}
    />
  );
}
