import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Route, Users, BookUser, Globe,
    ClipboardList, UsersRound, MapPinned, ChevronDown, Gem, Eye,
    Briefcase, Calendar, AlertTriangle, DollarSign, RefreshCw, RotateCcw, PhoneCall,
    FileText, FilePlus2, Headset, Settings, UserPlus, Menu, X as CloseIcon,
    ChevronLeft, ChevronRight
} from 'lucide-react';

const navItems = [
    { path: '/', label: 'لوحة القيادة', icon: LayoutDashboard },
    { path: '/geo', label: 'الهيكل الجغرافي', icon: Globe },
    { path: '/devices', label: 'دليل الأجهزة', icon: Gem },
    { path: '/routes', label: 'إدارة المسارات', icon: Route },
    { path: '/clients', label: 'سجل العملاء', icon: BookUser },
    { path: '/candidates', label: 'الأسماء المقترحة', icon: UserPlus },
    { path: '/employees', label: 'إدارة الفرق', icon: Users },
    { path: '/telemarketer', label: 'المسوّق الهاتفي', icon: Headset },
    { path: '/settings', label: 'إعدادات النظام', icon: Settings },
];

const planningChildren = [
    { path: '/planning/overview', label: 'ملخص الخطة', icon: Eye },
    { path: '/planning/schedule', label: 'جدولة الفرق', icon: UsersRound },
    { path: '/planning/assign', label: 'تعيين المسارات', icon: MapPinned },
];

const operationsChildren = [
    { path: '/tasks/today', label: 'مهام اليوم', icon: Calendar },
    { path: '/tasks/emergency', label: 'طوارئ', icon: AlertTriangle },
    { path: '/tasks/dues', label: 'مستحقات', icon: DollarSign },
    { path: '/tasks/periodic', label: 'صيانة دورية', icon: RefreshCw },
    { path: '/tasks/returns', label: 'إرجاع', icon: RotateCcw },
    { path: '/tasks/followup', label: 'متابعة', icon: PhoneCall },
];

const contractsChildren = [
    { path: '/contracts', label: 'سجل العقود', icon: FileText },
    { path: '/contracts/new', label: 'عقد جديد', icon: FilePlus2 },
];

export default function MainLayout() {
    const location = useLocation();
    const isPlanningActive = location.pathname.startsWith('/planning');
    const isOperationsActive = location.pathname.startsWith('/tasks');
    const isContractsActive = location.pathname.startsWith('/contracts');
    const [planningOpen, setPlanningOpen] = useState(isPlanningActive);
    const [operationsOpen, setOperationsOpen] = useState(isOperationsActive);
    const [contractsOpen, setContractsOpen] = useState(isContractsActive);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const toggleSidebar = () => setIsMobileMenuOpen(!isMobileMenuOpen);
    const toggleCollapse = () => setIsCollapsed(!isCollapsed);

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-30">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/30">
                        <Gem className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg font-bold text-slate-800">Golden CRM</span>
                </div>
                <button
                    onClick={toggleSidebar}
                    className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                >
                    {isMobileMenuOpen ? <CloseIcon className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </header>

            {/* Mobile Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="lg:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <aside className={`
                fixed lg:static inset-y-0 right-0 ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} w-64 bg-white border-l border-slate-200 flex flex-col z-50 shadow-sm flex-shrink-0 transition-all duration-300 transform
                ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
            `}>
                {/* Logo & Toggle Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div className={`flex items-center gap-3 ${isCollapsed ? 'lg:hidden' : 'flex'} ${isMobileMenuOpen ? 'flex' : ''}`}>
                        <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/30">
                            <Gem className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xl font-bold text-slate-800 tracking-wide">Golden CRM</span>
                    </div>
                    {/* Desktop Collapse Toggle */}
                    <button
                        onClick={toggleCollapse}
                        className="hidden lg:flex p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        {isCollapsed ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                    {/* Mobile Close Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 mt-16 lg:mt-0">
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/'}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={({ isActive }: { isActive: boolean }) =>
                                `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-right ${isActive
                                    ? 'bg-sky-50 text-sky-600 border-r-4 border-sky-500 font-bold'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                } ${isCollapsed ? 'lg:justify-center lg:px-0 lg:border-r-0' : ''}`
                            }
                            title={isCollapsed ? item.label : ''}
                        >
                            <item.icon className={`w-5 h-5 ${isCollapsed ? 'lg:w-6 lg:h-6' : ''}`} />
                            <span className={`${isCollapsed ? 'lg:hidden' : 'block'}`}>{item.label}</span>
                        </NavLink>
                    ))}

                    {/* Planning Parent */}
                    <div className={isCollapsed ? 'lg:hidden' : 'block'}>
                        <button
                            onClick={() => setPlanningOpen((o: boolean) => !o)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-right ${isPlanningActive
                                ? 'bg-sky-50 text-sky-600 font-bold'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            <ClipboardList className="w-5 h-5" />
                            <span className="flex-1">التخطيط اليومي</span>
                            <motion.div animate={{ rotate: planningOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                <ChevronDown className="w-3.5 h-3.5" />
                            </motion.div>
                        </button>

                        <AnimatePresence initial={false}>
                            {planningOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    {planningChildren.map(child => (
                                        <NavLink
                                            key={child.path}
                                            to={child.path}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className={({ isActive }: { isActive: boolean }) =>
                                                `w-full flex items-center gap-3 pr-12 pl-4 py-2.5 rounded-lg transition-all text-right text-sm ${isActive
                                                    ? 'text-sky-600 bg-sky-50 font-bold'
                                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                                }`
                                            }
                                        >
                                            <child.icon className="w-4 h-4" />
                                            <span>{child.label}</span>
                                        </NavLink>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Operations Parent */}
                    <div className={isCollapsed ? 'lg:hidden' : 'block'}>
                        <button
                            onClick={() => setOperationsOpen((o: boolean) => !o)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-right ${isOperationsActive
                                ? 'bg-sky-50 text-sky-600 font-bold'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            <Briefcase className="w-5 h-5" />
                            <span className="flex-1">العمليات والمهام</span>
                            <motion.div animate={{ rotate: operationsOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                <ChevronDown className="w-3.5 h-3.5" />
                            </motion.div>
                        </button>

                        <AnimatePresence initial={false}>
                            {operationsOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    {operationsChildren.map(child => (
                                        <NavLink
                                            key={child.path}
                                            to={child.path}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className={({ isActive }: { isActive: boolean }) =>
                                                `w-full flex items-center gap-3 pr-12 pl-4 py-2.5 rounded-lg transition-all text-right text-sm ${isActive
                                                    ? 'text-sky-600 bg-sky-50 font-bold'
                                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                                }`
                                            }
                                        >
                                            <child.icon className="w-4 h-4" />
                                            <span>{child.label}</span>
                                        </NavLink>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Contracts Parent */}
                    <div className={isCollapsed ? 'lg:hidden' : 'block'}>
                        <button
                            onClick={() => setContractsOpen((o: boolean) => !o)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-right ${isContractsActive
                                ? 'bg-sky-50 text-sky-600 font-bold'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            <FileText className="w-5 h-5" />
                            <span className="flex-1">إدارة العقود</span>
                            <motion.div animate={{ rotate: contractsOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                <ChevronDown className="w-3.5 h-3.5" />
                            </motion.div>
                        </button>

                        <AnimatePresence initial={false}>
                            {contractsOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    {contractsChildren.map(child => (
                                        <NavLink
                                            key={child.path}
                                            to={child.path}
                                            end={child.path === '/contracts'}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className={({ isActive }: { isActive: boolean }) =>
                                                `w-full flex items-center gap-3 pr-12 pl-4 py-2.5 rounded-lg transition-all text-right text-sm ${isActive
                                                    ? 'text-sky-600 bg-sky-50 font-bold'
                                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                                }`
                                            }
                                        >
                                            <child.icon className="w-4 h-4" />
                                            <span>{child.label}</span>
                                        </NavLink>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>


                </nav>

                {/* User Profile */}
                <div className="p-4 border-t border-slate-200 bg-slate-50/50">
                    <div className={`flex items-center gap-3 p-2 rounded-lg ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}`}>
                        <div className="relative">
                            <img
                                src="https://ui-avatars.com/api/?name=Ibrahim+Obaid&background=0ea5e9&color=fff"
                                alt="User"
                                className="w-10 h-10 rounded-full border border-slate-200"
                            />
                            <div className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
                        </div>
                        <div className={`flex-1 min-w-0 ${isCollapsed ? 'lg:hidden' : 'block'}`}>
                            <p className="text-sm font-semibold text-slate-700 truncate">إبراهيم عبيد</p>
                            <p className="text-xs text-slate-500 truncate">مدير النظام</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden bg-slate-50 mt-16 lg:mt-0">
                <Outlet />
            </main>
        </div>
    );
}
