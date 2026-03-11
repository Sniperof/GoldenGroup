import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { seedSystem } from './lib/seed';
import { ErrorBoundary } from './components/ErrorBoundary';
import MainLayout from './layout/MainLayout';
import Dashboard from './pages/Dashboard';
import GeoSettings from './pages/GeoSettings';
import RouteManager from './pages/RouteManager';
import Employees from './pages/Employees';
import Clients from './pages/Clients';
import ClientProfile from './pages/ClientProfile';
import CandidatesEntry from './pages/candidates/CandidatesEntry';
import TeamScheduler from './pages/planning/TeamScheduler';
import RouteAssigner from './pages/planning/RouteAssigner';
import PlanOverview from './pages/planning/PlanOverview';
import TodaysTasks from './pages/tasks/TodaysTasks';
import EmergencyTasks from './pages/tasks/EmergencyTasks';
import Dues from './pages/tasks/Dues';
import Periodic from './pages/tasks/Periodic';
import Returns from './pages/tasks/Returns';
import FollowUp from './pages/tasks/FollowUp';
import DeviceManagement from './pages/DeviceManagement';
import ContractList from './pages/contracts/ContractList';
import ContractForm from './pages/contracts/ContractForm';
import TelemarketerWorkspace from './pages/TelemarketerWorkspace';
import TeamTasksDetail from './pages/planning/TeamTasksDetail';
import MarketingOperations from './pages/tasks/MarketingOperations';
import SystemSettings from './pages/SystemSettings';
import Vacancies from './pages/jobs/Vacancies';
import PublicJobs from './pages/jobs/PublicJobs';
import Applications from './pages/jobs/Applications';
import ApplicationDetail from './pages/jobs/ApplicationDetail';


export default function App() {
    useEffect(() => {
        seedSystem();
    }, []);

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
                        <Route path="/clients/:id" element={<ClientProfile />} />
                        <Route path="/candidates" element={<CandidatesEntry />} />
                        <Route path="/planning/schedule" element={<TeamScheduler />} />
                        <Route path="/planning/assign" element={<RouteAssigner />} />
                        <Route path="/planning/overview" element={<PlanOverview />} />
                        <Route path="/planning/team-tasks/:teamKey" element={<TeamTasksDetail />} />
                        <Route path="/tasks/today" element={<TodaysTasks />} />
                        <Route path="/tasks/emergency" element={<EmergencyTasks />} />
                        <Route path="/tasks/dues" element={<Dues />} />
                        <Route path="/tasks/periodic" element={<Periodic />} />
                        <Route path="/tasks/returns" element={<Returns />} />
                        <Route path="/tasks/followup" element={<FollowUp />} />
                        <Route path="/operations/marketing" element={<MarketingOperations />} />
                        <Route path="/contracts" element={<ContractList />} />
                        <Route path="/contracts/new" element={<ContractForm />} />

                        <Route path="/telemarketer" element={<TelemarketerWorkspace />} />
                        <Route path="/settings" element={<SystemSettings />} />

                        {/* Job Applications Epic */}
                        <Route path="/jobs/vacancies" element={<Vacancies />} />
                        <Route path="/jobs/public" element={<PublicJobs />} />
                        <Route path="/jobs/applications" element={<Applications />} />
                        <Route path="/jobs/applications/:id" element={<ApplicationDetail />} />
                    </Route>
                </Routes>
            </ErrorBoundary>
        </BrowserRouter>
    );
}

