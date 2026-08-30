import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { toast } from '../toast/toastBus';
import { useAuth } from '../auth/useAuth';
import { ArrowRightIcon, BellIcon, ChevronDownIcon, ExchangeIcon, LogoutIcon, MenuIcon, ProfileIcon } from './icons';
import { Wordmark } from './Wordmark';

const NAV_LINKS = [
  { to: '/marketplace', label: 'Marketplace' },
  { to: '/library', label: 'My Library' },
  { to: '/listings', label: 'My Listings' },
  { to: '/requests', label: 'Requests' },
];

const ADMIN_NAV_LINKS = [
  { to: '/marketplace', label: 'Marketplace' },
  { to: '/admin', label: 'Admin Dashboard' },
  { to: '/admin/books', label: 'Admin Book Management' },
  { to: '/admin/categories', label: 'Admin Category Management' },
];

interface AppNavProps {
  unreadCount?: number;
}

export function AppNav({ unreadCount }: AppNavProps) {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const user = session?.user;

  const navLinks = user?.role === 'ADMIN' ? ADMIN_NAV_LINKS : NAV_LINKS;

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pathname, setPathname] = useState(location.pathname);
  const menuRef = useRef<HTMLDivElement>(null);

  if (location.pathname !== pathname) {
    setPathname(location.pathname);
    setMenuOpen(false);
    setMobileOpen(false);
  }

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  function handleSignOut() {
    logout();
    toast.info('You have been signed out.');
    navigate('/login', { replace: true });
  }

  return (
    <header className="app-nav">
      <div className="app-nav__inner">
        <div className="app-nav__brand">
          <NavLink to="/dashboard" aria-label="BookMaster dashboard">
            <Wordmark />
          </NavLink>
        </div>

        <nav className="app-nav__links" aria-label="Main">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `app-nav__link${isActive ? ' app-nav__link--active' : ''}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="app-nav__actions">
          <NavLink
            to="/notifications"
            className={({ isActive }) =>
              `app-nav__bell${isActive ? ' app-nav__bell--active' : ''}`
            }
            aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
          >
            <BellIcon size={20} />
            {unreadCount ? (
              <span className="app-nav__bell-badge" aria-hidden="true">
                {unreadCount}
              </span>
            ) : null}
          </NavLink>

          <div className="app-nav__user" ref={menuRef}>
            <button
              type="button"
              className="app-nav__user-btn"
              aria-expanded={menuOpen}
              aria-haspopup="true"
              onClick={() => setMenuOpen((value) => !value)}
            >
              <span className="app-nav__user-name">{user?.name}</span>
              <ChevronDownIcon size={14} />
            </button>
            {menuOpen ? (
              <div className="app-nav__box" role="menu" aria-label="Account">
                <div className="app-nav__box-id">
                  <div className="app-nav__box-name">{user?.name}</div>
                  <div className="app-nav__box-email">{user?.email}</div>
                  {user?.role === 'ADMIN' ? (
                    <span className="app-nav__role-tag">Admin</span>
                  ) : null}
                </div>
                <Link
                  to="/profile"
                  className="app-nav__menu-item app-nav__menu-item--link"
                  role="menuitem"
                >
                  <ProfileIcon size={16} />
                  Profile
                </Link>
                <Link
                  to="/history"
                  className="app-nav__menu-item app-nav__menu-item--link"
                  role="menuitem"
                >
                  <ExchangeIcon size={16} />
                  Exchange History
                </Link>
                <button
                  type="button"
                  className="app-nav__menu-item"
                  role="menuitem"
                  onClick={handleSignOut}
                >
                  <LogoutIcon size={16} />
                  Sign out
                </button>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            className="app-nav__mobile-toggle"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileOpen((value) => !value)}
          >
            <MenuIcon size={22} />
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="app-nav__mobile app-nav__mobile--open">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `app-nav__link${isActive ? ' app-nav__link--active' : ''}`
              }
            >
              {link.label}
              <ArrowRightIcon size={14} />
            </NavLink>
          ))}
        </div>
      ) : null}
    </header>
  );
}