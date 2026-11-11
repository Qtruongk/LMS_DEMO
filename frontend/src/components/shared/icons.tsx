import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, children, ...props }: IconProps & { children: React.ReactNode }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            {children}
        </svg>
    );
}

export function DashboardIcon(props: IconProps) {
    return <Icon {...props}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></Icon>;
}

export function BookIcon(props: IconProps) {
    return <Icon {...props}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></Icon>;
}

export function ClockIcon(props: IconProps) {
    return <Icon {...props}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></Icon>;
}

export function FileIcon(props: IconProps) {
    return <Icon {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></Icon>;
}

export function CheckIcon(props: IconProps) {
    return <Icon {...props}><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></Icon>;
}

export function ChartIcon(props: IconProps) {
    return <Icon {...props}><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></Icon>;
}

export function BellIcon(props: IconProps) {
    return <Icon {...props}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></Icon>;
}

export function CalendarIcon(props: IconProps) {
    return <Icon {...props}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></Icon>;
}

export function UsersIcon(props: IconProps) {
    return <Icon {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Icon>;
}

export function UserIcon(props: IconProps) {
    return <Icon {...props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></Icon>;
}

export function TrendIcon(props: IconProps) {
    return <Icon {...props}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></Icon>;
}

export function WalletIcon(props: IconProps) {
    return <Icon {...props}><rect x="1" y="5" width="22" height="16" rx="2" /><path d="M1 10h22" /><path d="M7 15h2" /></Icon>;
}

export function ReportIcon(props: IconProps) {
    return <Icon {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></Icon>;
}

export function SearchIcon(props: IconProps) {
    return <Icon {...props}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></Icon>;
}

export function MailIcon(props: IconProps) {
    return <Icon {...props}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></Icon>;
}

export function SunIcon(props: IconProps) {
    return <Icon {...props}><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></Icon>;
}

export function MoonIcon(props: IconProps) {
    return <Icon {...props}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></Icon>;
}

export function MenuIcon(props: IconProps) {
    return <Icon {...props}><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></Icon>;
}

export function ChevronRightIcon(props: IconProps) {
    return <Icon {...props}><polyline points="9 18 15 12 9 6" /></Icon>;
}

export function ChevronLeftIcon(props: IconProps) {
    return <Icon {...props}><polyline points="15 18 9 12 15 6" /></Icon>;
}

export function LogoutIcon(props: IconProps) {
    return <Icon {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></Icon>;
}

export function XIcon(props: IconProps) {
    return <Icon {...props}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Icon>;
}

export function ArrowUpIcon(props: IconProps) {
    return <Icon {...props}><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></Icon>;
}

export function ArrowDownIcon(props: IconProps) {
    return <Icon {...props}><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></Icon>;
}

export function DownloadIcon(props: IconProps) {
    return <Icon {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></Icon>;
}

export function FilterIcon(props: IconProps) {
    return <Icon {...props}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></Icon>;
}

export function MoreIcon(props: IconProps) {
    return <Icon {...props}><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></Icon>;
}

export function GraduationIcon(props: IconProps) {
    return <Icon {...props}><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5" /></Icon>;
}

export function StarIcon(props: IconProps) {
    return <Icon {...props}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></Icon>;
}

export function PlayIcon(props: IconProps) {
    return <Icon {...props}><polygon points="5 3 19 12 5 21 5 3" /></Icon>;
}

export function DollarSignIcon(props: IconProps) {
    return <Icon {...props}><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></Icon>;
}

export function TrendingUpIcon(props: IconProps) {
    return <Icon {...props}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></Icon>;
}

export function BriefcaseIcon(props: IconProps) {
    return <Icon {...props}><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></Icon>;
}

export function CheckCircleIcon(props: IconProps) {
    return <Icon {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></Icon>;
}

export function AlertCircleIcon(props: IconProps) {
    return <Icon {...props}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12.01" y1="16" x2="12.01" y2="16" strokeWidth="3" /></Icon>;
}

export function MapPinIcon(props: IconProps) {
    return <Icon {...props}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></Icon>;
}

export function VideoIcon(props: IconProps) {
    return <Icon {...props}><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></Icon>;
}

export function UploadIcon(props: IconProps) {
    return <Icon {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></Icon>;
}

export function InfoIcon(props: IconProps) {
    return <Icon {...props}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></Icon>;
}

export function MessageIcon(props: IconProps) {
    return <Icon {...props}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Icon>;
}

/** Map from string key to icon component — used by sidebar/nav */
export const iconMap: Record<string, (props: IconProps) => JSX.Element> = {
    dashboard: DashboardIcon,
    accounts: UsersIcon,
    classes: BookIcon,
    sessions: ClockIcon,
    materials: FileIcon,
    attendance: ClockIcon,
    assignments: CheckIcon,
    'class-operations': BookIcon,
    tests: CheckIcon,
    gradebook: ChartIcon,
    results: ChartIcon,
    notifications: BellIcon,
    schedule: CalendarIcon,
    students: UsersIcon,
    teachers: UserIcon,
    progress: TrendIcon,
    tuition: WalletIcon,
    reports: ReportIcon,
    finance: WalletIcon,
    'service-quality': ReportIcon,
    'data-analytics': TrendIcon,
    'teaching-report': ReportIcon,
    'class-report': ReportIcon,
    feedbacks: MessageIcon,
    library: BookIcon,
    requests: BellIcon,
};
