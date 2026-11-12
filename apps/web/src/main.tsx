import { webMessages as t } from '@lg/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './auth/auth.js';
import { router } from './router.js';
import './styles.css';
import { applyTheme } from './theme.js';

applyTheme();
document.title = t.appTitle;
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

const el = document.getElementById('root');
if (!el) throw new Error('#root topilmadi');
createRoot(el).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
