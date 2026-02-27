// components/brand-panel/index.tsx — Left branding panel shared by auth pages.
//
// Displays the logo, a tagline, and the BrandFooter. Hidden on mobile.

import { Box, Typography } from '@mui/material';

import { BrandFooter } from '@serve/components/brand-footer';

interface BrandPanelProps {
  tagline: React.ReactNode;
}

export function BrandPanel({ tagline }: BrandPanelProps) {
  return (
    <Box
      sx={{
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        justifyContent: 'space-between',
        bgcolor: 'primary.main',
        p: 6,
      }}
    >
      <Box
        component="img"
        src="/images/serve-logo-rainbow-row-dark.svg"
        alt="SERVE"
        sx={{ width: 160 }}
      />
      <Typography
        variant="h3"
        sx={{
          color: '#fff',
          maxWidth: 320,
          '& em': { color: 'secondary.light', fontStyle: 'normal' },
        }}
      >
        {tagline}
      </Typography>
      <BrandFooter />
    </Box>
  );
}
