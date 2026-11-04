import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/global.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { FeedbackProvider } from './context/FeedbackContext';
import { StorefrontProvider } from './context/StorefrontContext';
import { RealtimeProvider } from './context/RealtimeContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <FeedbackProvider>
        <AuthProvider>
          <RealtimeProvider>
          <CartProvider>
            <StorefrontProvider>
              <App />
            </StorefrontProvider>
            <ToastContainer position="top-right" autoClose={3500} newestOnTop pauseOnFocusLoss={false} theme="light" />
          </CartProvider>
          </RealtimeProvider>
        </AuthProvider>
      </FeedbackProvider>
    </BrowserRouter>
  </StrictMode>,
);
