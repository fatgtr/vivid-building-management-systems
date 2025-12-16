import Dashboard from './pages/Dashboard';
import Buildings from './pages/Buildings';
import Units from './pages/Units';
import Residents from './pages/Residents';
import WorkOrders from './pages/WorkOrders';
import Amenities from './pages/Amenities';
import Visitors from './pages/Visitors';
import Announcements from './pages/Announcements';
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
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Buildings": Buildings,
    "Units": Units,
    "Residents": Residents,
    "WorkOrders": WorkOrders,
    "Amenities": Amenities,
    "Visitors": Visitors,
    "Announcements": Announcements,
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
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};