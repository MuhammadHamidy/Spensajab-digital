'use client';

import React from 'react';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import { styled } from '@mui/material/styles';

export const StyledTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: '#FFFFFF',
    borderRadius: '6px',
    transition: 'all 0.15s ease',
    '& fieldset': {
      borderColor: '#CBD5E1',
    },
    '&:hover fieldset': {
      borderColor: '#94A3B8',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#2563EB',
      borderWidth: '1.5px',
    },
  },
  '& .MuiInputLabel-root': {
    color: '#64748B',
    fontWeight: 500,
    fontSize: '0.875rem',
    '&.Mui-focused': {
      color: '#2563EB',
      fontWeight: 600,
    },
  },
  '& .MuiInputBase-input': {
    color: '#0F172A',
    fontWeight: 500,
    fontSize: '0.875rem',
  },
}));

export function MuiSearchInput({
  value,
  onChange,
  placeholder = 'Cari...',
  className = '',
  size = 'small',
  ...props
}) {
  return (
    <StyledTextField
      variant="outlined"
      size={size}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: '#64748B', fontSize: 18 }} />
            </InputAdornment>
          ),
        },
      }}
      {...props}
    />
  );
}

export function MuiSelectField({
  label,
  value,
  onChange,
  children,
  size = 'small',
  fullWidth = true,
  className = '',
  ...props
}) {
  return (
    <FormControl fullWidth={fullWidth} size={size} className={className}>
      {label && (
        <InputLabel
          sx={{
            color: '#64748B',
            fontWeight: 500,
            fontSize: '0.875rem',
            '&.Mui-focused': { color: '#2563EB', fontWeight: 600 },
          }}
        >
          {label}
        </InputLabel>
      )}
      <Select
        value={value}
        label={label}
        onChange={onChange}
        sx={{
          backgroundColor: '#FFFFFF',
          borderRadius: '6px',
          fontWeight: 500,
          color: '#0F172A',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#CBD5E1',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#94A3B8',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#2563EB',
            borderWidth: '1.5px',
          },
        }}
        {...props}
      >
        {children}
      </Select>
    </FormControl>
  );
}
