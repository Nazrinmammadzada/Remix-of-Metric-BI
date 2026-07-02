// HR Anonim Bildiriş — user tərəfindəki forma ilə eyni interfeys.
import UserWhistleblowerPage from "./user/UserWhistleblowerPage";
import Header from "@/components/layout/Header";

const WhistleblowerPage = () => (
  <div className="min-h-screen">
    <Header title="Anonim Bildiriş" />
    <UserWhistleblowerPage />
  </div>
);

export default WhistleblowerPage;
