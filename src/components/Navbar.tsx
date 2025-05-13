
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User, History } from "lucide-react";

const Navbar = () => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-xl font-bold text-brand-600">
            Page Cost Calculator Pro
          </Link>

          <div className="flex items-center gap-6">
            {user ? (
              <>
                <Link 
                  to="/" 
                  className="text-gray-600 hover:text-brand-600 flex items-center gap-2"
                >
                  <User size={18} />
                  Calculator
                </Link>
                <Link 
                  to="/history" 
                  className="text-gray-600 hover:text-brand-600 flex items-center gap-2"
                >
                  <History size={18} />
                  History
                </Link>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSignOut}
                  className="flex items-center gap-2"
                >
                  <LogOut size={16} />
                  Sign out
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button variant="default" size="sm">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
