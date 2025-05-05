module.exports = {
    content: ["./app/**/*.{js,ts,jsx,tsx}"],
    safelist: [
      'text-text-primary',
      'text-text-secondary',
      'text-text-tertiary',
      'focus:ring-primary/20'
    ],
    theme: {
      extend: {
        colors: {
          primary: {
            DEFAULT: 'var(--primary)',
            light: 'var(--primary-light)',
            dark: 'var(--primary-dark)',
            50: '#EFF6FF',
            100: '#DBEAFE',
            200: '#BFDBFE',
            300: '#93C5FD',
            400: '#60A5FA',
            500: '#3B82F6',
            600: '#2563EB',
            700: '#1D4ED8',
            800: '#1E40AF',
            900: '#1E3A8A',
          },
          secondary: {
            50: '#F5F3FF',
            100: '#EDE9FE',
            200: '#DDD6FE',
            300: '#C4B5FD',
            400: '#A78BFA',
            500: '#8B5CF6',
            600: '#7C3AED',
            700: '#6D28D9',
            800: '#5B21B6',
            900: '#4C1D95',
          },
          text: {
            primary: 'var(--text-primary)',
            secondary: 'var(--text-secondary)',
            tertiary: 'var(--text-tertiary)',
            'on-primary': 'var(--text-on-primary)'
          },
          surface: {
            DEFAULT: 'var(--surface)',
            hover: 'var(--surface-hover)',
            elevated: 'var(--surface-elevated)'
          },
          border: {
            DEFAULT: 'var(--border)',
            hover: 'var(--border-hover)'
          },
          background: 'var(--background)',
          accent: {
            red: 'var(--accent-red)',
            amber: 'var(--accent-amber)',
            green: 'var(--accent-green)',
            blue: 'var(--accent-blue)',
            purple: 'var(--accent-purple)',
            'red-light': 'var(--accent-red-light)',
            'amber-light': 'var(--accent-amber-light)',
            'green-light': 'var(--accent-green-light)',
            'blue-light': 'var(--accent-blue-light)',
            'purple-light': 'var(--accent-purple-light)',
          }
        },
        fontFamily: {
          sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        },
        boxShadow: {
          task: '0 2px 4px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)',
          'task-hover': '0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.1)',
          sm: 'var(--shadow-sm)',
          DEFAULT: 'var(--shadow)',
          md: 'var(--shadow-md)',
          lg: 'var(--shadow-lg)',
        },
        animation: {
          'bounce-slow': 'bounce 2s infinite',
        },
        borderRadius: {
          'xl': '1rem',
          '2xl': '1.5rem',
        },
      },
    },
    plugins: [
      require('@tailwindcss/forms')
    ],
  };