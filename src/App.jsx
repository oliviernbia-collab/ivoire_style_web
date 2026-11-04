import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Loader } from './components/ui';
import Header from './components/Header';
import Footer, { StorefrontFooter } from './components/Footer';
import ResponsiveTables from './components/ResponsiveTables';
import { StorefrontEntry, StorefrontGuard, useStorefront } from './context/StorefrontContext';
import { RequireAuth } from './components/Layouts';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import ProductPage from './pages/ProductPage';
import { ShopList, ShopPage } from './pages/Shops';
import { ForgotPassword, Login, Register, ResetPassword } from './pages/Auth';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Payment from './pages/Payment';
import BecomeSeller from './pages/BecomeSeller';
import StaticPage, { NotFound } from './pages/StaticPage';
import {
  AccountLayout, Addresses, Advantages, Notifications, OrderDetail, Orders, Profile, Wishlist,
} from './pages/account/Account';

// Espaces vendeur et administration chargés à la demande
const seller = (name) => lazy(() => import('./pages/seller/Seller').then((m) => ({ default: m[name] })));
const admin = (name) => lazy(() => import('./pages/admin/Admin').then((m) => ({ default: m[name] })));
const SellerLayout = seller('SellerLayout');
const SellerDashboard = seller('SellerDashboard');
const SellerProducts = seller('SellerProducts');
const SellerProductForm = seller('SellerProductForm');
const SellerOrders = seller('SellerOrders');
const SellerFinances = seller('SellerFinances');
const SellerShop = seller('SellerShop');
const AdminLayout = admin('AdminLayout');
const AdminDashboard = admin('AdminDashboard');
const AdminShops = admin('AdminShops');
const AdminProducts = admin('AdminProducts');
const AdminOrders = admin('AdminOrders');
const AdminOrderDetail = admin('AdminOrderDetail');
const AdminUsers = admin('AdminUsers');
const AdminCategories = admin('AdminCategories');
const AdminPayouts = admin('AdminPayouts');
const AdminReviews = admin('AdminReviews');
const AdminSettings = admin('AdminSettings');
const AdminLogs = admin('AdminLogs');
const AdminPromotions = admin('AdminPromotions');
const AdminOfficialShop = admin('AdminOfficialShop');

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  const { pathname } = useLocation();
  // Le panneau d'administration (barre fixe sur toute la hauteur) n'affiche pas le pied de page public
  const isAdmin = pathname.startsWith('/admin');
  const navigate = useNavigate();
  const { shop: vitrine, exit: exitVitrine } = useStorefront();
  return (
    <>
      <ScrollToTop />
      <ResponsiveTables />
      <Header />
      <main style={{ minHeight: '60vh' }}>
        <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/" element={<StorefrontGuard><Home /></StorefrontGuard>} />
          <Route path="/catalogue" element={<StorefrontGuard keepQuery><Catalog /></StorefrontGuard>} />
          <Route path="/b/:slug" element={<StorefrontEntry />} />
          <Route path="/produit/:slug" element={<ProductPage />} />
          <Route path="/boutiques" element={<StorefrontGuard><ShopList /></StorefrontGuard>} />
          <Route path="/boutique/:slug" element={<ShopPage />} />
          <Route path="/connexion" element={<Login />} />
          <Route path="/inscription" element={<Register />} />
          <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
          <Route path="/reinitialiser-mot-de-passe" element={<ResetPassword />} />
          <Route path="/panier" element={<Cart />} />
          <Route path="/vendre" element={<BecomeSeller />} />
          <Route path="/page/:slug" element={<StaticPage />} />

          <Route element={<RequireAuth />}>
            <Route path="/commande" element={<Checkout />} />
            <Route path="/paiement/:id" element={<Payment />} />
            <Route path="/compte" element={<AccountLayout />}>
              <Route index element={<Profile />} />
              <Route path="commandes" element={<Orders />} />
              <Route path="commandes/:id" element={<OrderDetail />} />
              <Route path="adresses" element={<Addresses />} />
              <Route path="favoris" element={<Wishlist />} />
              <Route path="avantages" element={<Advantages />} />
              <Route path="notifications" element={<Notifications />} />
            </Route>
            <Route path="/vendeur" element={<SellerLayout />}>
              <Route index element={<SellerDashboard />} />
              <Route path="produits" element={<SellerProducts />} />
              <Route path="produits/nouveau" element={<SellerProductForm key="new" />} />
              <Route path="produits/:id" element={<SellerProductForm />} />
              <Route path="commandes" element={<SellerOrders />} />
              <Route path="finances" element={<SellerFinances />} />
              <Route path="boutique" element={<SellerShop />} />
            </Route>
          </Route>

          <Route element={<RequireAuth roles={['admin', 'support']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="boutiques" element={<AdminShops />} />
              <Route path="produits" element={<AdminProducts />} />
              <Route path="commandes" element={<AdminOrders />} />
              <Route path="commandes/:id" element={<AdminOrderDetail />} />
              <Route path="utilisateurs" element={<AdminUsers />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="reversements" element={<AdminPayouts />} />
              <Route path="avis" element={<AdminReviews />} />
              <Route path="parametres" element={<AdminSettings />} />
              <Route path="journal" element={<AdminLogs />} />
              <Route path="promotions" element={<AdminPromotions />} />
              <Route path="boutique-officielle" element={<AdminOfficialShop />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </main>
      {!isAdmin && (vitrine
        ? <StorefrontFooter shop={vitrine} onExit={() => { exitVitrine(); navigate('/'); }} />
        : <Footer />)}
    </>
  );
}
