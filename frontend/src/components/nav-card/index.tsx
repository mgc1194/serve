import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Box, Card, CardActionArea, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export interface NavCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}

export function NavCard({ icon, title, description, onClick, disabled = false }: NavCardProps) {
  return (
    <Card
      elevation={0}
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        opacity: disabled ? 0.5 : 1,
        transition: 'border-color 0.15s, box-shadow 0.15s',
        ...(!disabled && {
          '&:hover': {
            borderColor: 'secondary.dark',
            boxShadow: '0 2px 12px rgba(44, 72, 186, 0.10)',
          },
        }),
      }}
    >
      <CardActionArea
        onClick={onClick}
        disabled={disabled}
        sx={{
          px: 3,
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          justifyContent: 'flex-start',
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1.5,
            bgcolor: 'secondary.light',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'secondary.dark',
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography fontWeight={600} sx={{ lineHeight: 1.3 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </Box>
        {disabled ? (
          <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
            Coming soon
          </Typography>
        ) : (
          <ChevronRightIcon sx={{ color: 'text.disabled' }} />
        )}
      </CardActionArea>
    </Card>
  );
}
