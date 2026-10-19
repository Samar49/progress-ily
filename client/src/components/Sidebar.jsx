import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Target,
  ChartNoAxesColumn,
  CalendarRange,
  Timer,
  Settings,
  CircleHelp,
  Leaf,
  LogOut,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Daily Planner", path: "/planner", icon: CalendarDays },
  { label: "Goals", path: "/goals", icon: Target },
  { label: "Analytics", path: "/analytics", icon: ChartNoAxesColumn },
  { label: "Calendar", path: "/calendar", icon: CalendarRange },
  { label: "Focus Timer", path: "/focus", icon: Timer },
];

function NavItem({ item }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
      title={item.label}
    >
      <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
      <span>{item.label}</span>
    </NavLink>
  );
}

export default function Sidebar({ user, onLogout, open = false, onClose }) {
  const initials = (user?.name || "User")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <aside className={`sidebar ${open ? "open" : ""}`} aria-label="Sidebar">
      <div className="brand">
        <span className="brand-mark">
          <Leaf size={26} aria-hidden="true" />
        </span>
        <span>Progress.ily</span>
        <button type="button" className="pi-icon-btn pi-drawer-close" onClick={onClose} aria-label="Close menu">
          <X size={20} />
        </button>
      </div>

      <nav className="primary-nav" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.path} item={item} />
        ))}
      </nav>

      <div className="sidebar-bottom">
        <NavItem item={{ label: "Settings", path: "/settings", icon: Settings }} />
        <NavItem item={{ label: "Help & Support", path: "/help", icon: CircleHelp }} />

        <div className="profile">
          <div className="avatar" aria-hidden="true">{initials}</div>
          <div>
            <strong>{user?.name || "Your profile"}</strong>
            <small>Stay consistent</small>
          </div>
          <button type="button" className="pi-icon-btn" onClick={onLogout} aria-label="Log out" title="Log out">
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </aside>
  );
}