// User KPI İzlənməsi — istifadəçi hesabında rəhbər hesabındakı ilə eyni UI/UX
// göstərilir. Auth kontekstində USER rolu olduğu üçün `getVisibleKpiCards`
// və digər scope helper-ləri avtomatik olaraq yalnız istifadəçinin öz
// kartlarını qaytarır — bu səbəbdən read-only view-only rejim təbii yaranır.
import ManagerKpiTrackingPage from "@/pages/manager/ManagerKpiTrackingPage";

const UserKpiCardsPage = () => <ManagerKpiTrackingPage />;

export default UserKpiCardsPage;
