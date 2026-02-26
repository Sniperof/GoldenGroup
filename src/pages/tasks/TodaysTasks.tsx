import { useState } from 'react';
import { Calendar, Search, Filter, Target, ListTodo } from 'lucide-react';
import TaskCard from '../../components/TaskCard';
import { defaultTasks } from '../../lib/defaultData';
import MarketingOperationsContent from '../../components/marketing/MarketingOperationsContent';

const getToday = () => new Date().toISOString().split('T')[0];

export default function TodaysTasks() {
    const [activeTab, setActiveTab] = useState<'tasks' | 'marketing'>('tasks');
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<string>('all');

    const today = getToday();
    let tasks = defaultTasks.filter(t => t.dueDate === today && t.customerName.includes(search));

    if (filterType !== 'all') {
        tasks = tasks.filter(t => t.type === filterType);
    }

    const stats = {
        total: defaultTasks.filter(t => t.dueDate === today).length,
        emergency: defaultTasks.filter(t => t.dueDate === today && t.type === 'emergency').length,
        dues: defaultTasks.filter(t => t.dueDate === today && t.type === 'dues').length,
        periodic: defaultTasks.filter(t => t.dueDate === today && t.type === 'periodic').length,
        returns: defaultTasks.filter(t => t.dueDate === today && t.type === 'returns').length,
        followup: defaultTasks.filter(t => t.dueDate === today && t.type === 'followup').length,
    };

    return (
        <div className="h-full overflow-y-auto p-8 custom-scroll">
            <div className="flex items-end justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-2">
                        <ListTodo className="w-7 h-7 text-sky-600" />
                        <span>أنشطة وعمليات اليوم</span>
                    </h1>
                    <p className="text-slate-500 text-sm">متابعة كافة المهام المجدولة وعمليات التسويق.</p>
                </div>
            </div>

            {/* Toggle Tabs */}
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl mb-6 w-max">
                <button
                    onClick={() => setActiveTab('tasks')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'tasks' ? 'bg-white text-sky-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Calendar className="w-4 h-4" /> مهام الأقسام
                </button>
                <button
                    onClick={() => setActiveTab('marketing')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'marketing' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Target className="w-4 h-4" /> عمليات التسويق
                </button>
            </div>

            {activeTab === 'marketing' ? (
                <MarketingOperationsContent />
            ) : (
                <>
                    <div className="flex items-end justify-between mb-4">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-50 border border-sky-200">
                            <span className="text-sky-600 font-bold text-lg">{stats.total}</span>
                            <span className="text-sky-600 text-sm">مهمة اليوم</span>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-5 gap-3 mb-6">
                        {[
                            { icon: '🔴', value: stats.emergency, label: 'طوارئ', color: 'border-red-500' },
                            { icon: '🟡', value: stats.dues, label: 'مستحقات', color: 'border-amber-500' },
                            { icon: '🔵', value: stats.periodic, label: 'دورية', color: 'border-blue-500' },
                            { icon: '🟣', value: stats.returns, label: 'إرجاع', color: 'border-purple-500' },
                            { icon: '🟢', value: stats.followup, label: 'متابعة', color: 'border-emerald-500' },
                        ].map((stat, i) => (
                            <div key={i} className={`bg-white rounded-xl shadow-sm border border-gray-200 p-3 flex items-center gap-3 border-r-4 ${stat.color}`}>
                                <span className="text-xl">{stat.icon}</span>
                                <div>
                                    <p className="text-slate-800 font-bold text-lg">{stat.value}</p>
                                    <p className="text-xs text-gray-500">{stat.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Search & Filter */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="بحث عن عميل..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg pr-10 pl-4 py-2 text-sm text-slate-800 placeholder:text-gray-400 focus:border-sky-500 focus:bg-white focus:outline-none transition-colors"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-gray-400" />
                            <select
                                value={filterType}
                                onChange={e => setFilterType(e.target.value)}
                                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none transition-colors"
                            >
                                <option value="all">الكل</option>
                                <option value="emergency">🔴 طوارئ</option>
                                <option value="dues">🟡 مستحقات</option>
                                <option value="periodic">🔵 دورية</option>
                                <option value="returns">🟣 إرجاع</option>
                                <option value="followup">🟢 متابعة</option>
                            </select>
                        </div>
                    </div>

                    {/* Task List */}
                    <div className="space-y-3">
                        {tasks.length === 0 ? (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 py-16 text-center">
                                <Calendar className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                                <p className="text-slate-700 text-lg font-medium">لا توجد مهام لهذا اليوم</p>
                            </div>
                        ) : (
                            tasks.map(task => (
                                <TaskCard key={task.id} task={task} onView={(t) => alert(`عرض المهمة: ${t.customerName}`)} />
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
