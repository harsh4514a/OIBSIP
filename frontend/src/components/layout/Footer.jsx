import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Instagram, Twitter, Facebook, Youtube, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import '../pizza/pureVegBadge.css';

const footerLinks = {
  Company: [
    { label: 'About Us', href: '/about' },
    { label: 'Careers', href: '/careers' },
    { label: 'Blog', href: '/blog' },
    { label: 'Press', href: '/press' },
  ],
  Support: [
    { label: 'Help Center', href: '/help' },
    { label: 'Track Order', href: '/orders' },
    { label: 'Refund Policy', href: '/refund' },
    { label: 'Contact Us', href: '/contact' },
  ],
  Menu: [
    { label: 'All Pizzas', href: '/menu' },
    { label: 'Build Your Pizza', href: '/build' },
  ],
};

function Footer() {
  const [email, setEmail] = useState('');

  const handleNewsletter = (e) => {
    e.preventDefault();
    toast.success('Thanks for subscribing! 🎉');
    setEmail('');
  };

  return (
    <footer className="bg-gray-900 text-gray-400 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🍕</span>
              <span className="text-xl font-bold font-display text-white">PizzaHub</span>
            </Link>
            <p className="text-sm leading-relaxed mb-4 max-w-xs">
              Hot & fresh pizza delivered to your door in 30 minutes. Made with love, delivered with care.
            </p>
            <p className="pure-veg-footer mb-6">100% Pure Vegetarian Kitchen</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-orange-500 flex-shrink-0" />
                <span>123 Pizza Street, Mumbai 400001</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-orange-500 flex-shrink-0" />
                <span>+91 98765 43210</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-orange-500 flex-shrink-0" />
                <span>hello@pizzahub.in</span>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              {[Instagram, Twitter, Facebook, Youtube].map((Icon, i) => (
                <button
                  key={i}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-800 hover:bg-orange-500 text-gray-400 hover:text-white transition-all duration-200"
                  aria-label="Social media"
                >
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">{title}</h4>
              <ul className="space-y-2.5">
                {links.map(link => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm hover:text-orange-400 transition-colors duration-200 hover:translate-x-1 inline-block"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h4 className="text-white font-semibold mb-1">Get exclusive deals in your inbox 📬</h4>
              <p className="text-sm">Subscribe for 20% off your first order!</p>
            </div>
            <form onSubmit={handleNewsletter} className="flex gap-2 w-full max-w-sm">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="flex-1 h-10 rounded-lg bg-gray-800 border border-gray-700 px-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
              <button
                type="submit"
                className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              >
                Subscribe <ArrowRight size={14} />
              </button>
            </form>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <p>© 2025 PizzaHub. All rights reserved. Made with ❤️ in India</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-orange-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-orange-400 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-orange-400 transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
