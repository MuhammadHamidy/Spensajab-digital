'use client';

import React from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

export default function MuiAlertSnackbar({
  open,
  onClose,
  message,
  severity = 'success',
  autoHideDuration = 4000,
  anchorOrigin = { vertical: 'bottom', horizontal: 'center' },
}) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={anchorOrigin}
    >
      <Alert
        onClose={onClose}
        severity={severity}
        variant="filled"
        sx={{
          width: '100%',
          borderRadius: '6px',
          fontWeight: 600,
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)',
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
