// pages/households/household-detailed-card/household-member-list.tsx — Read-only list of household members.

import { Box, Typography } from '@mui/material';

import type { HouseholdMember } from '@serve/types/global';

interface HouseholdMemberListProps {
  members: HouseholdMember[];
}

export function HouseholdMemberList({ members }: HouseholdMemberListProps) {
  if (members.length === 0) {
    return (
      <Typography variant="body2" color="text.disabled">
        No members yet.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {members.map(m => (
        <Box key={m.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              bgcolor: 'secondary.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'secondary.dark',
              flexShrink: 0,
            }}
          >
            {m.first_name[0]}{m.last_name[0]}
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={500} sx={{ lineHeight: 1.2 }}>
              {m.first_name} {m.last_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {m.email}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}
