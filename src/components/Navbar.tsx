import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User, History, Menu, X } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center gap-6">
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

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-4">
            {user ? (
              <>
                <Link 
                  to="/" 
                  className="block text-gray-600 hover:text-brand-600 flex items-center gap-2 py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User size={18} />
                  Calculator
                </Link>
                <Link 
                  to="/history" 
                  className="block text-gray-600 hover:text-brand-600 flex items-center gap-2 py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <History size={18} />
                  History
                </Link>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    handleSignOut();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full justify-center"
                >
                  <LogOut size={16} />
                  Sign out
                </Button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                <Button variant="default" size="sm" className="w-full">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
