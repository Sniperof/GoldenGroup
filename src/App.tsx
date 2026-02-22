import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import MainLayout from './layout/MainLayout';
import Dashboard from './pages/Dashboard';
import GeoSettings from './pages/GeoSettings';
import RouteManager from './pages/RouteManager';
import Employees from './pages/Employees';
import Clients from './pages/Clients';
import CandidatesEntry from './pages/candidates/CandidatesEntry';
import TeamScheduler from './pages/planning/TeamScheduler';
import RouteAssigner from './pages/planning/RouteAssigner';
import PlanOverview from './pages/planning/PlanOverview';
import TodaysTasks from './pages/tasks/TodaysTasks';
import Emergency from './pages/tasks/Emergency';
import Dues from './pages/tasks/Dues';
import Periodic from './pages/tasks/Periodic';
import Returns from './pages/tasks/Returns';
import FollowUp from './pages/tasks/FollowUp';
import DeviceManagement from './pages/DeviceManagement';
import ContractList from './pages/contracts/ContractList';
import ContractForm from './pages/contracts/ContractForm';
import TelemarketerWorkspace from './pages/TelemarketerWorkspace';
import TeamTasksDetail from './pages/planning/TeamTasksDetail';
import SystemSettings from './pages/SystemSettings';

export default function App() {
    return (
        <BrowserRouter>
            <ErrorBoundary>
                <Routes>
                    <Route element={<MainLayout />}>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/devices" element={<DeviceManagement />} />
                        <Route path="/geo" element={<GeoSettings />} />
                        <Route path="/routes" element={<RouteManager />} />
                        <Route path="/employees" element={<Employees />} />
                        <Route path="/clients" element={<Clients />} />
                        <Route path="/candidates" element={<CandidatesEntry />} />
                        <Route path="/planning/schedule" element={<TeamScheduler />} />
                        <Route path="/planning/assign" element={<RouteAssigner />} />
                        <Route path="/planning/overview" element={<PlanOverview />} />
                        <Route path="/planning/team-tasks/:teamKey" element={<TeamTasksDetail />} />
                        <Route path="/tasks/today" element={<TodaysTasks />} />
                        <Route path="/tasks/emergency" element={<Emergency />} />
                        <Route path="/tasks/dues" element={<Dues />} />
                        <Route path="/tasks/periodic" element={<Periodic />} />
                        <Route path="/tasks/returns" element={<Returns />} />
                        <Route path="/tasks/followup" element={<FollowUp />} />
                        <Route path="/contracts" element={<ContractList />} />
                        <Route path="/contracts/new" element={<ContractForm />} />
                        <Route path="/telemarketer" element={<TelemarketerWorkspace />} />
                        <Route path="/telemarketer" element={<TelemarketerWorkspace />} />
                        <Route path="/settings" element={<SystemSettings />} />
                    </Route>
                </Routes>
            </ErrorBoundary>
        </BrowserRouter>
    );
}

