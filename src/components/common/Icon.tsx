import {
  AlertCircle, AlertTriangle, ArrowRight, BadgeCheck, Bell, Binary, BookOpen,
  Boxes, ChartNoAxesCombined, CheckCircle2, CirclePlus, Cloud, CloudUpload,
  Combine, Database, Download, Eye, Folder, GitBranch, HelpCircle, Info,
  LayoutDashboard, Link, LoaderCircle, Menu, Network, PanelRight, Play, Plus, Search,
  SlidersHorizontal, Sparkles, Table, Terminal, Upload, WandSparkles, Wrench,
  X, ZoomIn, ZoomOut,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface IconProps {
  readonly name: string;
  readonly className?: string;
  readonly label?: string;
}

const icons: Record<string, LucideIcon> = {
  account_tree: GitBranch,
  add: Plus,
  add_circle: CirclePlus,
  add_link: Link,
  analytics: ChartNoAxesCombined,
  arrow_forward: ArrowRight,
  auto_awesome: Sparkles,
  bolt: WandSparkles,
  build: Wrench,
  check_circle: CheckCircle2,
  close: X,
  cloud: Cloud,
  cloud_done: Cloud,
  cloud_off: Cloud,
  cloud_upload: CloudUpload,
  database: Database,
  database_off: Database,
  dns: Network,
  dock_to_right: PanelRight,
  download: Download,
  error_outline: AlertCircle,
  fit_screen: Boxes,
  folder: Folder,
  help_center: HelpCircle,
  hub: Network,
  info: Info,
  join_inner: Combine,
  manage_search: Search,
  menu: Menu,
  menu_book: BookOpen,
  notifications: Bell,
  output: ArrowRight,
  play_arrow: Play,
  progress_activity: LoaderCircle,
  schema: Binary,
  search: Search,
  swap_horiz: ArrowRight,
  sync_alt: ArrowRight,
  table_chart: Table,
  task_alt: CheckCircle2,
  terminal: Terminal,
  troubleshoot: Wrench,
  tune: SlidersHorizontal,
  upload_file: Upload,
  verified: BadgeCheck,
  visibility: Eye,
  warning: AlertTriangle,
  workspaces: Boxes,
  zoom_in: ZoomIn,
  zoom_out: ZoomOut,
  dashboard: LayoutDashboard,
};

export const Icon = ({ name, className = '', label }: Readonly<IconProps>) => {
  const Component = icons[name] ?? AlertCircle;
  return (
    <Component
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={`inline-block shrink-0 ${className}`}
      focusable="false"
    />
  );
};
