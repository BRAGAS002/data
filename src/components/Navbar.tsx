import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User, History, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('nav')) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [window.location.pathname]);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-lg sm:text-xl font-bold text-brand-600 hover:text-brand-700 transition-colors">
            Page Cost Calculator Pro
          </Link>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center gap-4 lg:gap-6">
            {user ? (
              <>
                <Link 
                  to="/" 
                  className="text-gray-600 hover:text-brand-600 flex items-center gap-2 transition-colors"
                >
                  <User size={18} />
                  <span>Calculator</span>
                </Link>
                <Link 
                  to="/history" 
                  className="text-gray-600 hover:text-brand-600 flex items-center gap-2 transition-colors"
                >
                  <History size={18} />
                  <span>History</span>
                </Link>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSignOut}
                  className="flex items-center gap-2 hover:bg-gray-50 transition-colors"
                >
                  <LogOut size={16} />
                  <span>Sign out</span>
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button variant="default" size="sm" className="hover:bg-brand-700 transition-colors">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        <div 
          className={`md:hidden overflow-hidden transition-all duration-200 ease-in-out ${
            isMenuOpen ? 'max-h-48 opacity-100 mt-4' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="space-y-2 py-2">
            {user ? (
              <>
                <Link 
                  to="/" 
                  className="block text-gray-600 hover:text-brand-600 flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User size={18} />
                  <span>Calculator</span>
                </Link>
                <Link 
                  to="/history" 
                  className="block text-gray-600 hover:text-brand-600 flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <History size={18} />
                  <span>History</span>
                </Link>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    handleSignOut();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full justify-center hover:bg-gray-50 transition-colors"
                >
                  <LogOut size={16} />
                  <span>Sign out</span>
                </Button>
              </>
            ) : (
              <Link 
                to="/auth" 
                onClick={() => setIsMenuOpen(false)}
                className="block"
              >
                <Button 
                  variant="default" 
                  size="sm" 
                  className="w-full hover:bg-brand-700 transition-colors"
                >
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
