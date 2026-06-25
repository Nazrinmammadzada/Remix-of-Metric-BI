import { ShieldX } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AccessDenied = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <ShieldX className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Giriş Qadağandır</h1>
        <p className="text-muted-foreground mb-6">Bu səhifəyə giriş icazəniz yoxdur.</p>
        <button onClick={() => navigate(-1)} className="px-6 py-2 text-sm rounded-lg bg-primary text-primary-foreground">Geri Qayıt</button>
      </div>
    </div>
  );
};

export default AccessDenied;
