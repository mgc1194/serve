// components/brand-footer/index.tsx — Tagline used in the brand panel of auth pages.

import { Typography } from '@mui/material';

export function BrandFooter() {
  return (
    <Typography sx={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
      Spending · Earnings · Resources · View · Engine
    </Typography>
  );
}
