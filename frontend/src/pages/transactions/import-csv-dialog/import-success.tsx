// pages/transactions/import-csv-dialog/import-success.tsx
//
// Step 3 — Success: shown after a CSV has been imported successfully.

import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { Box, Typography } from '@mui/material';

import type { FileImportResult } from '@serve/types/global';

interface ImportSuccessProps {
  result: FileImportResult;
}

export function ImportSuccess({ result }: ImportSuccessProps) {
  return (
    <Box sx={{ textAlign: 'center', py: 2 }}>
      <CheckCircleOutlineIcon
        sx={{ fontSize: 48, color: 'success.main', mb: 2 }}
      />
      <Typography variant="h6" gutterBottom>
        Import successful
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {result.inserted} transaction{result.inserted !== 1 ? 's' : ''} imported
        from <strong>{result.filename}</strong>.
      </Typography>
      {result.skipped > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {result.skipped} duplicate{result.skipped !== 1 ? 's' : ''} skipped.
        </Typography>
      )}
    </Box>
  );
}
