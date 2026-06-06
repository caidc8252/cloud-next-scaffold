import {
  Activity,
  Building2,
  Check,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  HelpCircle,
  Home,
  Info,
  Lock,
  LogOut,
  Mail,
  MessageSquare,
  Package,
  Pencil,
  Settings,
  Shield,
  Trash2,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

// Maps the prototype's string icon names (carried on mock data rows such as
// activity items and help categories) to lucide icons. Static icons in
// components import lucide directly; this is only for data-driven names.
const ICONS: Record<string, LucideIcon> = {
  activity: Activity,
  building: Building2,
  check: Check,
  chevR: ChevronRight,
  download: Download,
  edit: Pencil,
  external: ExternalLink,
  file: FileText,
  help: HelpCircle,
  home: Home,
  info: Info,
  lock: Lock,
  logout: LogOut,
  mail: Mail,
  message: MessageSquare,
  package: Package,
  settings: Settings,
  shield: Shield,
  trash: Trash2,
  user: User,
  users: Users,
};

export function AccountIcon({ name, size = 16 }: { name: string; size?: number }) {
  const Glyph = ICONS[name] ?? Info;
  return <Glyph size={size} aria-hidden />;
}
