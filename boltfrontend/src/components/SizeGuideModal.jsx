import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import SizeGuideContent from './SizeGuideContent';

export default function SizeGuideModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-white max-w-3xl w-full rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div>
            <h3 className="font-serif text-2xl text-neutral-900">Standard Size Guide</h3>
            <p className="text-sm text-neutral-500">Compare measurements across categories.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-500 hover:text-neutral-900 transition-colors"
            aria-label="Close size guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-6 py-4">
          <SizeGuideContent showTitle={false} />
        </div>
        <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 text-sm text-neutral-600 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span>Need the full experience?</span>
          <Link
            to="/size-guide"
            className="text-neutral-900 font-medium hover:underline"
            onClick={onClose}
          >
            Open dedicated Size Guide page →
          </Link>
        </div>
      </div>
    </div>
  );
}


