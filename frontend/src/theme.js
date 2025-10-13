import { createTheme } from '@mui/material/styles';

// Create a custom Material-UI theme that matches our app's dark theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6366f1', // --primary (indigo-500)
      dark: '#4338ca', // --primary-700
      light: '#818cf8',
    },
    secondary: {
      main: '#06b6d4', // --accent (cyan-500)
    },
    success: {
      main: '#22c55e', // --ok
    },
    warning: {
      main: '#f59e0b', // --warn
    },
    error: {
      main: '#ef4444', // --danger
    },
    background: {
      default: '#0b0f14', // --bg
      paper: '#111827', // --panel
    },
    text: {
      primary: '#e5e7eb', // --text
      secondary: '#9ca3af', // --muted
    },
    divider: '#243042', // --border
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: '10px',
          padding: '10px 20px',
          transition: 'all 0.2s ease',
        },
        contained: {
          background: 'linear-gradient(90deg, #4338ca, #6366f1)',
          boxShadow: '0 4px 14px rgba(99, 102, 241, 0.25)',
          '&:hover': {
            background: 'linear-gradient(90deg, #4338ca, #6366f1)',
            filter: 'brightness(1.1)',
            boxShadow: '0 6px 20px rgba(99, 102, 241, 0.35)',
          },
        },
        outlined: {
          borderColor: '#243042',
          '&:hover': {
            borderColor: '#6366f1',
            background: 'rgba(99, 102, 241, 0.1)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '10px',
            backgroundColor: '#0f1720',
            transition: 'all 0.2s ease',
            '& fieldset': {
              borderColor: '#243042',
            },
            '&:hover fieldset': {
              borderColor: '#6366f1',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#6366f1',
              borderWidth: '2px',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#9ca3af',
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: '#6366f1',
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          border: '1px solid',
        },
        standardInfo: {
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderColor: '#3b82f6',
          color: '#e5e7eb',
        },
        standardSuccess: {
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderColor: '#22c55e',
          color: '#e5e7eb',
        },
        standardWarning: {
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          borderColor: '#f59e0b',
          color: '#e5e7eb',
        },
        standardError: {
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderColor: '#ef4444',
          color: '#e5e7eb',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#111827',
          borderRadius: '16px',
          border: '1px solid #243042',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          backgroundColor: '#243042',
          borderRadius: '5px',
        },
        bar: {
          background: 'linear-gradient(90deg, #4338ca, #6366f1)',
          borderRadius: '5px',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
          },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          '& .MuiSwitch-switchBase.Mui-checked': {
            color: '#6366f1',
            '& + .MuiSwitch-track': {
              backgroundColor: '#6366f1',
            },
          },
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: '#6366f1',
        },
      },
    },
  },
});

export default theme;

