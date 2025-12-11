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
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};