// Thin wrapper around NavCard with household-specific title, description,
// and icon. Navigates to /households on click.

import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import { useNavigate } from 'react-router';

import { NavCard } from '@components/nav-card';

export function HouseholdsNavCard() {
  const navigate = useNavigate();

  return (
    <NavCard
      icon={<PeopleOutlineIcon />}
      title="Households"
      description="Manage households, members, and settings."
      onClick={() => navigate('/households')}
    />
  );
}
