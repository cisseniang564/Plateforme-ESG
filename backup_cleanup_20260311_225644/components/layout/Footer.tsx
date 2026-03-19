export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white border-t border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center gap-4">
          <span>© {currentYear} ESGFlow. All rights reserved.</span>
          <span className="text-gray-400">|</span>
          <a href="#" className="hover:text-primary-600 transition-colors">Privacy</a>
          <a href="#" className="hover:text-primary-600 transition-colors">Terms</a>
          <a href="#" className="hover:text-primary-600 transition-colors">Support</a>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs font-medium">
            Version 0.1.0
          </span>
        </div>
      </div>
    </footer>
  );
}
