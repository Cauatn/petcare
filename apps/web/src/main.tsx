import { NuqsAdapter } from 'nuqs/adapters/react-router/v7';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import './app.css';
import { AppRoutes } from './appRoutes';
import TanstackQueryClientProvider from './providers/tanstackQueryClientProvider';

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<BrowserRouter>
			<NuqsAdapter>
				<TanstackQueryClientProvider>
					<AppRoutes />
				</TanstackQueryClientProvider>
				<ToastContainer />
			</NuqsAdapter>
		</BrowserRouter>
	</StrictMode>,
);
