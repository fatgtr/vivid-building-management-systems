import Dashboard from './pages/Dashboard';
import Buildings from './pages/Buildings';
import Residents from './pages/Residents';
import WorkOrders from './pages/WorkOrders';
import Amenities from './pages/Amenities';
import Visitors from './pages/Visitors';
import Documents from './pages/Documents';
import Inspections from './pages/Inspections';
import Contractors from './pages/Contractors';
import Settings from './pages/Settings';
import MaintenanceSchedule from './pages/MaintenanceSchedule';
import ResidentPortal from './pages/ResidentPortal';
import SmartDevices from './pages/SmartDevices';
import ManagingAgentPortal from './pages/ManagingAgentPortal';
import StrataKnowledgeBase from './pages/StrataKnowledgeBase';
import BuildingProfile from './pages/BuildingProfile';
import AssetRegister from './pages/AssetRegister';
import ContractorPortal from './pages/ContractorPortal';
import ResidentProfile from './pages/ResidentProfile';
import RoleManagement from './pages/RoleManagement';
import Reports from './pages/Reports';
import Home from './pages/Home';
import Notifications from './pages/Notifications';
import Communications from './pages/Communications';
import OperationsCenter from './pages/OperationsCenter';
import ResidentsCenter from './pages/ResidentsCenter';
import PartnerManagement from './pages/PartnerManagement';
import PartnerDashboard from './pages/PartnerDashboard';
import PlatformDashboard from './pages/PlatformDashboard';
import VividStaffManagement from './pages/VividStaffManagement';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Buildings": Buildings,
    "Residents": Residents,
    "WorkOrders": WorkOrders,
    "Amenities": Amenities,
    "Visitors": Visitors,
    "Documents": Documents,
    "Inspections": Inspections,
    "Contractors": Contractors,
    "Settings": Settings,
    "MaintenanceSchedule": MaintenanceSchedule,
    "ResidentPortal": ResidentPortal,
    "SmartDevices": SmartDevices,
    "ManagingAgentPortal": ManagingAgentPortal,
    "StrataKnowledgeBase": StrataKnowledgeBase,
    "BuildingProfile": BuildingProfile,
    "AssetRegister": AssetRegister,
    "ContractorPortal": ContractorPortal,
    "ResidentProfile": ResidentProfile,
    "RoleManagement": RoleManagement,
    "Reports": Reports,
    "Home": Home,
    "Notifications": Notifications,
    "Communications": Communications,
    "OperationsCenter": OperationsCenter,
    "ResidentsCenter": ResidentsCenter,
    "PartnerManagement": PartnerManagement,
    "PartnerDashboard": PartnerDashboard,
    "PlatformDashboard": PlatformDashboard,
    "VividStaffManagement": VividStaffManagement,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};